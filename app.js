const puppeteer = require('puppeteer');
const date = require('date-and-time');
const fs = require('fs');
const http = require('https');
const { json } = require('stream/consumers');

const arsenal = "Arsenal";
const mancity = "Manchester City";
const realmadrid = "Real Madrid";
const manutd = "Manchester United";
const bayern = "Bayern Munich";
const liverpool = "Liverpool"
const napoli = "SSC Napoli"
const barcelona = "Barcelona"
const atm = "Atletico Madrid"
const psg = "Paris Saint-Germain"
const leverkusen = "Bayer Leverkusen"

const inggris = "Inggris Raya - Premier League"
const germany = "Jerman - Bundesliga"
const france = "Prancis - Ligue 1"
const italy = "Italia - Serie A"
const spanyol = "Spanyol - LaLiga"
const champions = "International - Champions League"
const europaleague = "International - Europa League"

function checkPrediction(predict, goal) {
    const goalPredict = predict.match(/(Over|Under) ([+-]?\d+(\.\d+)?) Goals/);
    if (predict.toLowerCase().includes("over")) {
        const threshold = parseFloat(goalPredict[2]); // Extract number from string
        return goal >= threshold;
    } else if (predict.toLowerCase().includes("under")) {
        const threshold = parseFloat(goalPredict[2]); // Extract number from string
        return goal <= threshold;
    }
    return false; // Default case if the format is not recognized
}

function checkGoalPrediction(predict, homeScore, awayScore) {
    const match = predict.match(/(Home|Away) ([+-]?\d+(\.\d+)?) Goals/); // Extract team and goal difference
    if (!match) return false; // Invalid format

    const team = match[1]; // "Home" or "Away"
    const predictedDifference = parseFloat(match[2]); // Extract +3 or -3 as a number

    if (team === "Home") {
        homeScore += predictedDifference;
          
        return homeScore >= awayScore; // Home must win/lose by the predicted margin
    } else if (team === "Away") {
        awayScore += predictedDifference;
          
        return awayScore >= homeScore; // Away must win/lose by the predicted margin
    }

    return false; // Default case
}

(async () => {
    const url = "https://www.goal.com/id/jadwal/2025-07-30";
    const tanggal_match = url.match(/(\d{4}-\d{2}-\d{2})/);
    const filename = tanggal_match[0].replaceAll("-", "")+".json";
    const url_call = "https://hakimasmui.github.io/orcascore/"+filename

    const req = http.request(url_call, async (res) => {
        let data = ''
    
        res.on('data', (chunk) => {
            data += chunk;
        });
    
        // Ending the response 
        res.on('end', () => {
            let jsonArray;
            try {
                let json = JSON.parse(data)
                jsonArray =  json.data
                console.log("ada data")
            } catch(err) {
                jsonArray = JSON.parse("[]")
                console.log("tidak ada data")
            }

            crawlGaol(url, filename, tanggal_match, jsonArray);
        });
    
    }).on("error", (err) => {
        console.log("Error: ", err)
    }).end();
})();

async function crawlGaol(url, filename, tanggal_match, jsonArray) {
    console.log("crawl start")
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage()
    await page.goto(url, {waitUntil: 'domcontentloaded'})
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => { 
        if ( 
            interceptedRequest.url().endsWith('.png') || 
            interceptedRequest.url().endsWith('.jpg') || 
            interceptedRequest.url().includes('.png?') || 
            interceptedRequest.url().includes('.jpg?') 
        ) { 
            interceptedRequest.abort(); 
        } else { 
            interceptedRequest.continue(); 
        } 
    }); 
    await page.waitForSelector("div.fco-competition-section");
    // const teams = [bayern, atm, "Real Sociedad", "Bayer Leverkusen", "Lyon", "Fenerbahce"];
    // const league = [spanyol, france, germany, "Turki - Super Lig"];

    const teams = ["Olimpija Ljubljana", "Dynamo Kiev", "Drita"];
    const league = ["International - Champions League Qualification", "International - Conference League Qualification"];
    let items = [];
    let tanggal;
    if (tanggal_match)
        tanggal = tanggal_match[0];
    else
        tanggal = date.format(new Date(), 'YYYY-MM-DD')
    
    const matches = await page.$$('div.fco-competition-section')
    for (const match of matches) {
        const title = await page.evaluate(el => el.querySelector("span.fco-competition-section__header-text > span").textContent, match)
        console.log(title)
        if (league.includes(title)) {
            console.log("liga ditemukan")
            const schedules = await page.$$('div.fco-match-row__container')
            for (const schedule of schedules) {
                const home = await page.evaluate(el => el.querySelector("div.fco-match-team-and-score__team-a > div > div.fco-team-name.fco-long-name").textContent, schedule)
                const img_home = await page.evaluate(el => el.querySelector("div.fco-match-team-and-score__team-a > div > span > img").getAttribute('src'), schedule)
                const away = await page.evaluate(el => el.querySelector("div.fco-match-team-and-score__team-b > div > div.fco-team-name.fco-long-name").textContent, schedule)
                const img_away = await page.evaluate(el => el.querySelector("div.fco-match-team-and-score__team-b > div > span > img").getAttribute('src'), schedule)
                const scoreHome = await page.evaluate(el => el.querySelector('div.fco-match-score__container > div.fco-match-score[data-side="team-a"]').textContent, schedule)
                const scoreAway = await page.evaluate(el => el.querySelector('div.fco-match-score__container > div.fco-match-score[data-side="team-b"]').textContent, schedule)

                if (teams.includes(home) || teams.includes(away)) {
                    console.log("tim ditemukan")
                    if (scoreHome == "-") {
                        console.log(home, "pertandingan belum selesai")
                        let jam = await page.evaluate(el => el.querySelector("div > a.fco-match-start-date > time").textContent, schedule)
                        jam = jam.replace(".", ":")

                        if (jsonArray.length == 0) {
                            items.push({
                                "tanggal": tanggal+" "+jam,
                                "imgHome": img_home,
                                "home": home,
                                "imgAway": img_away,
                                "away": away,
                                "results": {
                                    "result": "Coming Soon",
                                    "goals": "Cooming Soon"
                                }
                            })
                        } else {
                            jsonArray.forEach(match => {
                                if (home == match.home && away == match.away) {
                                    items.push(match)
                                }
                            });
                        }
                    } else {
                        console.log(home, "pertandingan selesai")
                        const homeScore = parseFloat(scoreHome)
                        const awayScore = parseFloat(scoreAway)
    
                        jsonArray.forEach(match => {
                            if (home == match.home && away == match.away) {
                                const isCorrect = checkGoalPrediction(match.results.result, homeScore, awayScore);
                                const isOverUnder = checkPrediction(match.results.goals, homeScore+awayScore)
                                
                                match.results.result_predict = [isCorrect, isOverUnder];
                                match.skorHome = homeScore;
                                match.skorAway = awayScore;
                                items.push(match)
                            }
                        });
                    }
                }

                if (items.length >= teams.length)
                    break;
            }
        }

        if (items.length >= teams.length)
            break;
    }

    let result = {
        "status": 200,
        "message": "SUCCESS",
        "data": items
    }

    if (items.length > 0) {
        fs.writeFile(filename, JSON.stringify(result, null, 4), function (err) {
            if (err) throw err;
            console.log('Saved!');
        });
    }

    await browser.close();
}