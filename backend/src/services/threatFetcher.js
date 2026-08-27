const axios = require("axios");
const db = require("../database/db");


function formatDate(dateString) {
  if (!dateString) return "Data Desconhecida";
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function generateCTIReport(attack) {
  return `Foi identificado um <strong>novo incidente de ransomware</strong> envolvendo uma organização localizada no <strong style="color: green;">Brasil</strong>.

O evento foi detectado a partir de fontes públicas de inteligência de ameaças e pode indicar atividade recente de grupos de ransomware atuando na região.

<strong>🔎 Detalhes do Incidente:</strong>

👾 Grupo de Ransomware: ${attack.grupo}<br>
🏢 Organização Vítima: <strong style="text-transform:uppercase;">${attack.vitima}</strong><br>
📅 Data da Detecção: ${formatDate(attack.data_incidente)}<br>
🌎 País: <strong style="color: green;">Brasil(BR)</strong><br>
🌐Fonte do Incidente:
${attack.url}`;
}

async function updateThreatsFromAPI() {
  console.log("Fetching latest threats from ransomware tracking APIs...");

  // Run both fetches in parallel so one timeout doesn't block the other
  const fetchRansomwareLive = async () => {
    try {
      const apiKey = process.env.RANSOMWARE_LIVE_API_KEY;

      if (!apiKey) {
        console.warn(
          "⚠️ API Key do Ransomware.Live PRO (RANSOMWARE_LIVE_API_KEY) não encontrada! Preencha no seu .env para usar a V3 (PRO).",
        );
        return;
      }

      const responseRL = await axios.get(
        "https://api-pro.ransomware.live/victims/recent?order=discovered",
        {
          timeout: 60000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json",
            "x-api-key": apiKey,
          },
        },
      );

      const recentVictimsRL = (responseRL.data.victims || []).slice(0, 100);
      let count = 0;

      for (const item of recentVictimsRL) {
        const grupo = item.group || item.group_name || "Unknown Actor";
        const vitima = item.victim || item.post_title || "Unknown Victim";
        const data_incidente = item.discovered || null;
        const pais = item.country || "N/A";
        const fonte = "Ransomware.Live";
        const url = item.post_url || `https://www.ransomware.live`;

        await processThreatItem(
          grupo,
          vitima,
          data_incidente,
          pais,
          fonte,
          url,
        );
        count++;
      }
      console.log(
        `✅ Ransomware.Live (API V3 - PRO): ${count} threats processed.`,
      );
    } catch (errRL) {
      console.warn(
        "⚠️ Ransomware.Live indisponível (API V3 - PRO):",
        errRL.response
          ? `${errRL.response.status} ${errRL.response.statusText}`
          : errRL.message,
      );
    }
  };

  const fetchRansomFeed = async () => {
    try {
      const responseRF = await axios.get("https://api.ransomfeed.it/", {
        timeout: 60000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
      });

      const recentVictimsRF = responseRF.data.slice(0, 100);
      let count = 0;

      for (const item of recentVictimsRF) {
        const grupo = item.gang || "Unknown Actor";
        const vitima = item.victim || "Unknown Victim";
        const data_incidente = item.date
          ? item.date.replace(" ", "T") + "Z"
          : null;
        const pais = item.country || "N/A";
        const fonte = "RansomFeed";
        const url = item.website || `https://ransomfeed.it/`;

        await processThreatItem(
          grupo,
          vitima,
          data_incidente,
          pais,
          fonte,
          url,
        );
        count++;
      }
      console.log(`✅ RansomFeed: ${count} threats processed.`);
    } catch (errRF) {
      console.error("❌ Error fetching from RansomFeed:", errRF.message);
    }
  };

  // Execute both in parallel - neither blocks the other
  await Promise.allSettled([fetchRansomwareLive(), fetchRansomFeed()]);

  console.log("Finished processing real threats from APIs.");
}

async function processThreatItem(
  grupo,
  vitima,
  data_incidente,
  pais,
  fonte,
  url,
) {
  return new Promise((resolve) => {
    // Check if this specific threat already exists in the local database
    db.get(
      "SELECT id, email_sent, reportText FROM AMEACA WHERE grupo = ? AND vitima = ?",
      [grupo, vitima],
      async (err, row) => {
        if (err) {
          console.error("Error checking existing threat:", err);
          return resolve();
        }

        const paisNorm = pais.toLowerCase();
        const isBR = ["br", "brazil", "brasil"].includes(paisNorm);
        let reportText = null;

        if (row) {
          if (isBR && !row.reportText) {
            const attackObj = { grupo, vitima, data_incidente, pais, url };
            reportText = generateCTIReport(attackObj);
            db.run("UPDATE AMEACA SET reportText = ? WHERE id = ?", [
              reportText,
              row.id,
            ]);
          }
          resolve();
        } else {
          if (isBR) {
            const attackObj = { grupo, vitima, data_incidente, pais, url };
            reportText = generateCTIReport(attackObj);
          }

          // Threat doesn't exist, insert it
          const insertQuery = `INSERT INTO AMEACA (grupo, vitima, data_incidente, pais, fonte, url, email_sent, reportText) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`;

          db.run(
            insertQuery,
            [grupo, vitima, data_incidente, pais, fonte, url, reportText],
            async function (err) {
              if (err) {
                console.error("Error inserting threat:", err);
                return resolve();
              }

              const newId = this.lastID;

              // Check if we need to send an email for this new threat
              if (isBR) {
                db.run(
                  "UPDATE AMEACA SET email_sent = 1 WHERE id = ?",
                  [newId],
                  (err) => {
                    if (err)
                      console.error("Error updating email_sent status:", err);
                    resolve();
                  },
                );
              } else {
                resolve();
              }
            },
          );
        }
      },
    );
  });
}

module.exports = { updateThreatsFromAPI };
