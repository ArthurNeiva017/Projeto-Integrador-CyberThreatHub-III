const axios = require('axios');
const rssParser = require('rss-parser');
const db = require('../database/db');

const parser = new rssParser();

// Utilizando a API pública do NIST NVD para buscar as últimas CVEs
async function updateCVEsFromAPI() {
    console.log('Fetching latest CVEs from NIST NVD API...');

    // A API do NVD 2.0 não ordena por "mais recentes" automaticamente. 
    // É necessário filtrar pela data de publicação para não pegar CVEs velhas!
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000));

    // NVD API requer formato exato: YYYY-MM-DDTHH:mm:ss.000 (sem a letra Z no final do ISO)
    const formatNVDDate = (d) => d.toISOString().split('.')[0] + '.000';

    const CVE_API_URL = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${formatNVDDate(threeDaysAgo)}&pubEndDate=${formatNVDDate(now)}&resultsPerPage=50`;

    try {
        const response = await axios.get(CVE_API_URL, {
            timeout: 30000, // 30 segundos
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json'
            }
        });

        // Pega as CVEs do período, e forçamos a ordenação decrescente (mais nova = p.0)
        let vulnerabilities = response.data.vulnerabilities || [];
        vulnerabilities.sort((a, b) => new Date(b.cve.published) - new Date(a.cve.published));

        // Pega apenas as exatas 30 mais novas dessa lista processada!
        const recentItems = vulnerabilities.slice(0, 30);

        for (const item of recentItems) {
            const cve = item.cve;
            if (!cve) continue;

            const cveId = cve.id || `CVE-UNKNOWN-${Math.floor(Math.random() * 1000)}`;

            // Verificar se a CVE já existe pelo cve_id
            db.get("SELECT id FROM CVE WHERE cve_id = ?", [cveId], (err, row) => {
                if (!row) {
                    // Tentar extrair um resumo da descrição em inglês
                    let originalSummary = 'Descrição detalhada não fornecida pela fonte no momento.';
                    if (cve.descriptions && cve.descriptions.length > 0) {
                        const enDesc = cve.descriptions.find(d => d.lang === 'en' || d.lang === 'en-US');
                        if (enDesc) originalSummary = enDesc.value;
                        else originalSummary = cve.descriptions[0].value;
                    }

                    let aiSummary = originalSummary;

                    const insertCVE = db.prepare('INSERT INTO CVE (cve_id, data_publicacao, cvss, resumo, url) VALUES (?, ?, ?, ?, ?)');

                    const pubDate = cve.published || new Date().toISOString();

                    let cvssScore = null;
                    if (cve.metrics) {
                        const cvssMetrics = cve.metrics.cvssMetricV31 || cve.metrics.cvssMetricV30 || cve.metrics.cvssMetricV2;
                        if (cvssMetrics && cvssMetrics.length > 0 && cvssMetrics[0].cvssData) {
                            cvssScore = cvssMetrics[0].cvssData.baseScore;
                        }
                    }

                    const referenceUrl = (cve.references && cve.references.length > 0) ? cve.references[0].url : `https://nvd.nist.gov/vuln/detail/${cveId}`;

                    insertCVE.run(
                        cveId,
                        pubDate,
                        cvssScore,
                        aiSummary,
                        referenceUrl
                    );
                    insertCVE.finalize();
                }
            });
        }
    } catch (error) {
        console.error('Error fetching CVEs from NIST API:', error.message);
    }
}

async function updateCVEsFromRSS() {
    console.log('Fetching latest CVEs from CVEFeed RSS...');
    const url = 'https://cvefeed.io/rssfeed/latest.xml';

    try {
        const response = await axios.get(url, {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none'
            }
        });

        let xmlData = response.data;
        // Fix unescaped ampersands to avoid parsing errors
        xmlData = xmlData.replace(/&(?!(?:apos|quot|[a-zA-Z0-9]+|#\\d+);)/g, '&amp;');

        const feedData = await parser.parseString(xmlData);
        const recentItems = feedData.items.slice(0, 30);

        for (const item of recentItems) {
            // Extract CVE ID from title or link
            const titleMatch = item.title && item.title.match(/(CVE-\d{4}-\d{4,7})/i);
            const linkMatch = item.link && item.link.match(/(CVE-\d{4}-\d{4,7})/i);
            const cveId = (titleMatch && titleMatch[1]) || (linkMatch && linkMatch[1]) || `CVE-UNKNOWN-${Math.floor(Math.random() * 1000)}`;

            // O usuário só quer ver CVEs estritamente recentes e ativas. 
            // Antigas que apenas sofreram atualizações de texto na NVD hoje devem ser ignoradas.
            if (cveId.startsWith('CVE-199') || cveId.startsWith('CVE-200') || cveId.startsWith('CVE-201') ||
                cveId.startsWith('CVE-2020') || cveId.startsWith('CVE-2021') || cveId.startsWith('CVE-2022') || cveId.startsWith('CVE-2023')) {
                continue;
            }

            db.get("SELECT id FROM CVE WHERE cve_id = ?", [cveId], async (err, row) => {
                if (!row) {
                    let snippet = item.contentSnippet || item.summary || item.description || 'Descrição não disponível no feed RSS.';
                    if (snippet.length > 500) snippet = snippet.substring(0, 497) + '...';

                    let aiSummary = snippet;

                    let cvssScore = null;
                    let cvefeedJsonStr = null;
                    // Auto-fetch precise CVSS inline to prevent missing badges on frontend
                    try {
                        const apiKey = process.env.CVEFEED_API_KEY || 'cvefeed_Su0tPaP8_fdf2ce16de0a34c3e73f292264c5b579a5eac7c126bb5fd7c4496359ef5b6764';
                        const detailsRes = await axios.get(`https://cvefeed.io/api/vulnerability/${cveId}/`, {
                            headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
                            timeout: 10000
                        });

                        // Atualiza com as reais descrições ricas da API do CVEFeed.io!
                        if (detailsRes.data) {
                            if (detailsRes.data.title && detailsRes.data.solution && Array.isArray(detailsRes.data.solution.actions)) {
                                cvefeedJsonStr = JSON.stringify(detailsRes.data);
                            }

                            if (detailsRes.data.cvss_score) cvssScore = detailsRes.data.cvss_score;

                            if (detailsRes.data.description) {
                                let descStr = detailsRes.data.description;
                                if (descStr.length > 500) descStr = descStr.substring(0, 497) + '...';
                                aiSummary = detailsRes.data.description;
                            }
                        }
                    } catch (fetchErr) {
                        // Keep null on failure to not crash the RSS loop
                    }

                    const insertCVE = db.prepare('INSERT INTO CVE (cve_id, data_publicacao, cvss, resumo, url, cvefeed_json) VALUES (?, ?, ?, ?, ?, ?)');
                    const pubDate = item.isoDate || item.pubDate || new Date().toISOString();
                    const referenceUrl = item.link || `https://nvd.nist.gov/vuln/detail/${cveId}`;

                    insertCVE.run(cveId, pubDate, cvssScore, aiSummary, referenceUrl, cvefeedJsonStr);
                    insertCVE.finalize();
                }
            });
        }
    } catch (error) {
        if (error.response && error.response.status === 403) {
            console.log(`[Aviso] CVEFeed RSS aguardando liberação do Cloudflare (403). Tentaremos novamente mais tarde.`);
        } else {
            console.error('Error fetching CVEs from RSS:', error.message);
        }
    }
}

module.exports = { updateCVEsFromAPI, updateCVEsFromRSS };

