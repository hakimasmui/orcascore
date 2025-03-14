const puppeteer = require('puppeteer');
const date = require('date-and-time');

const arsenal = "Arsenal";
const mancity = "Manchester City";
const realmadrid = "Real Madrid";
const manutd = "Manchester United";
const bayern = "Bayern Munich";

const inggris = "England - Premier League"
const germany = "Germany - Bundesliga"
const france = "France - Ligue 1"
const italy = "Italy - Serie A"
const spanyol = "Spain - LaLiga"
const champions = "International - Champions League"
const europaleague = "International - Europa League"

function checkPrediction(predict, goal) {
    if (predict.toLowerCase().includes("over")) {
        const threshold = parseFloat(predict.match(/\d+/)[0]); // Extract number from string
        return goal > threshold;
    } else if (predict.toLowerCase().includes("under")) {
        const threshold = parseFloat(predict.match(/\d+/)[0]); // Extract number from string
        return goal < threshold;
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
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage()
    await page.goto('https://www.goal.com/id/jadwal/2025-03-15', {waitUntil: 'domcontentloaded'})
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
    const teams = ["Genoa", "Las Palmas", "Nice"];
    const league = [italy, spanyol, france];
    const jsonArray = JSON.parse('[{"tanggal":"2025-03-14 00:45","imgHome":"https://cdn.sportfeeds.io/sdl/images/team/crest/medium/xcc8juLCbw-DaA7wqr_ug.png?quality=60&auto=webp&format=pjpg","home":"Lazio","imgAway":"https://cdn.sportfeeds.io/sdl/images/team/crest/medium/NWXbwvITfz5VDa27SauSA.png?quality=60&auto=webp&format=pjpg","away":"Viktoria Plzen","results":{"result":"Away +1.5 Goals","goals":"Over 2.5 Goals"}},{"tanggal":"2025-03-14 00:45","imgHome":"https://cdn.sportfeeds.io/sdl/images/team/crest/medium/7h4N4ZU17VQqx1GNJwuvF.png?quality=60&auto=webp&format=pjpg","home":"Athletic Bilbao","imgAway":"https://cdn.sportfeeds.io/sdl/images/team/crest/medium/fqxU8GBeoLw0gLDZvhELq.png?quality=60&auto=webp&format=pjpg","away":"Roma","results":{"result":"Home -0.5 Goals","goals":"Over 1.75 Goals"}},{"tanggal":"2025-03-14 03:00","imgHome":"https://cdn.sportfeeds.io/sdl/images/team/crest/medium/StOWHY8QeOZ7MplXkp2KC.png?quality=60&auto=webp&format=pjpg","home":"Manchester United","imgAway":"https://cdn.sportfeeds.io/sdl/images/team/crest/medium/N79j9O-sTkXZNhc9UZUsX.png?quality=60&auto=webp&format=pjpg","away":"Real Sociedad","results":{"result":"Home -0.5 Goals","goals":"Over 1.75 Goals"}},{"tanggal":"2025-03-14 03:00","imgHome":"https://cdn.sportfeeds.io/sdl/images/team/crest/medium/9QuhS30De-PnujU8oknsX.png?quality=60&auto=webp&format=pjpg","home":"Lyon","imgAway":"https://cdn.sportfeeds.io/sdl/images/team/crest/medium/YTiHM5ybxpLHEAYcn0F59.png?quality=60&auto=webp&format=pjpg","away":"FC FCSB","results":{"result":"Home -1 Goals","goals":"Over 2.25 Goals"}}]');
    let items = [];
    const tanggal = date.format(new Date(), 'YYYY-MM-DD')
    const matches = await page.$$('div.fco-competition-section')
    for (const match of matches) {
        const title = await page.evaluate(el => el.querySelector("span.fco-competition-section__header-text > span").textContent, match)
        
        if (league.includes(title)) {
            const schedules = await page.$$('div.fco-match-row__container')
            for (const schedule of schedules) {
                const home = await page.evaluate(el => el.querySelector("div.fco-match-team-and-score__team-a > div > div.fco-team-name.fco-long-name").textContent, schedule)
                const img_home = await page.evaluate(el => el.querySelector("div.fco-match-team-and-score__team-a > div > span > img").getAttribute('src'), schedule)
                const away = await page.evaluate(el => el.querySelector("div.fco-match-team-and-score__team-b > div > div.fco-team-name.fco-long-name").textContent, schedule)
                const img_away = await page.evaluate(el => el.querySelector("div.fco-match-team-and-score__team-b > div > span > img").getAttribute('src'), schedule)
                const scoreHome = await page.evaluate(el => el.querySelector('div.fco-match-score__container > div.fco-match-score[data-side="team-a"]').textContent, schedule)
                const scoreAway = await page.evaluate(el => el.querySelector('div.fco-match-score__container > div.fco-match-score[data-side="team-b"]').textContent, schedule)

                if (teams.includes(home) || teams.includes(away)) {
                    if (scoreHome == "-") {
                        const jam = await page.evaluate(el => el.querySelector("div > a.fco-match-start-date > time").textContent, schedule)
                        
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
                        const homeScore = parseFloat(scoreHome)
                        const awayScore = parseFloat(scoreAway)
    
                        jsonArray.forEach(match => {
                            if (home == match.home && away == match.away) {
                                console.log(match.results.goals)
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

    console.log(JSON.stringify(items))

    await browser.close();
})();