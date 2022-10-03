fs = require("fs");
const scraperObject = {
  url:
    "https://satoriz-comboire.bio/collections/boissons-sans-alcools/famille-boissons-vegetales",

  async scraper(browser) {
    // Loop through each of those links, open a new page instance and get the relevant data from them
    let pagePromise = link =>
      new Promise(async (resolve, reject) => {
        let dataObj = {};
        let newPage = await browser.newPage();
        await newPage.goto(link);
        dataObj["productUrl"] = link;
        dataObj["productTitle"] = await newPage.$eval(
          ".product-single__meta > h1",
          text => text.textContent
        );
        dataObj["productBrand"] = await newPage.$eval(
          ".product__vendor",
          text => text.textContent.split("\n")[1].split("  ")[6]
        );
        dataObj["productPrice"] = await newPage.$eval(
          ".rqp",
          text => text.textContent.split("/")[0]
        );

        dataObj["productImageUrl"] = await newPage.evaluate(() => {
          let element = document.querySelector(".zoomImg");
          if (element) {
            return document.querySelector(".zoomImg").src;
          } else {
            return null;
          }
        });
        dataObj["productRef"] = await newPage.$eval(
          ".product__refs",
          ref => ref.textContent.split(": ")[2].split("\n")[0]
        );
        resolve(dataObj);
        await newPage.close();
      });
    let page = await browser.newPage();
    console.log(`Navigating to ${this.url}...`);
    await page.goto(this.url);
    let scrapedData = [];
    // Wait for the required DOM to be rendered
    await page.waitForSelector(".grid__item--content");
    let pagesNumber = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".pagination li")).map(
        x => x.textContent
      );
    });
    pagesNumber = parseInt(pagesNumber[1].split(" ").slice(-3)[0]);
    // Get the link to all the required books
    if (isNaN(pagesNumber) === Number) {
      // case of single page
      let urls = await page.$$eval(".product-card a", links => {
        // Extract the links from the data
        return links.map(el => el.href);
      });
      for (link in urls) {
        let currentPageData = await pagePromise(urls[link]);
        scrapedData.push(currentPageData);
      }
      // Convert scraped Data to csv format
      const header = Object.keys(scrapedData[0]);
      let csv = scrapedData.map(row =>
        header.map(fieldName => JSON.stringify(row[fieldName])).join(";")
      );
      csv.unshift(header.join(";"));
      csv = csv.join("\r\n");
      // export to CSV File
      try {
        fs.writeFile("./export.csv", csv, { flag: "w" }, function() {
          console.log(csv);
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      // case of more than single page
      let urlList = [];
      for (let i = 1; i <= pagesNumber; i++) {
        await page.goto(
          "https://satoriz-comboire.bio/collections/boissons-sans-alcools/famille-boissons-vegetales?page=" +
            i
        );
        let urls = await page.$$eval(".product-card a", links => {
          // Extract the links from the data
          return links.map(el => el.href);
        });
        urlList = urlList.concat(urls);
      }
      console.log(urlList);

      for (link in urlList) {
        let currentPageData = await pagePromise(urlList[link]);
        scrapedData.push(currentPageData);
      }
      // Convert scraped Data to csv format
      const header = Object.keys(scrapedData[0]);
      let csv = scrapedData.map(row =>
        header.map(fieldName => JSON.stringify(row[fieldName])).join(";")
      );
      csv.unshift(header.join(";"));
      csv = csv.join("\r\n");
      // export to CSV File
      try {
        fs.writeFile("./export.csv", csv, { flag: "w" }, function() {
          console.log(csv);
        });
      } catch (e) {
        console.error(e);
      }
      await page.close();
    }
  }
};

module.exports = scraperObject;
