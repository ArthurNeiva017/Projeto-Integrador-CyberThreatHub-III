const axios = require('axios');

async function testCVE() {
    try {
        const apiKey = 'cvefeed_Su0tPaP8_fdf2ce16de0a34c3e73f292264c5b579a5eac7c126bb5fd7c4496359ef5b6764';
        const response = await axios.get('https://cvefeed.io/api/vulnerability/CVE-2024-21412/', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });
        console.log("Success:", Object.keys(response.data));
    } catch (err) {
        console.error("Error:", err.message);
        if (err.response) {
            console.error("Data:", err.response.data);
            console.error("Status:", err.response.status);
        }
    }
}

testCVE();
