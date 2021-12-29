import { test, expect } from "@playwright/test";
import PushBullet from "pushbullet";

// This test really only works for milford. It checks for all the huts having availability which doesn't apply to all walks.
const trackName = "Milford Track";
const numOfPeople = 3;
const pushbulletApiKey = process.env.PUSHBULLET_API_KEY;

test("test", async ({ page }) => {
  await page.goto(
    "https://bookings.doc.govt.nz/Saturn/Facilities/SearchViewGW.aspx"
  );

  // select track
  await page.selectOption(
    'select[name="ctl00$ctl00$mainContent$homeContent$ddlPlaces"]',
    { label: trackName }
  );

  // wait for page refresh
  await expect(page).toHaveURL(
    "https://bookings.doc.govt.nz/Saturn/Facilities/SearchViewGW.aspx"
  );

  // select number of people
  await page.selectOption(
    'select[name="ctl00$ctl00$mainContent$homeContent$ddlParty"]',
    `${numOfPeople}`
  );

  // Click on search
  await Promise.all([
    page.waitForNavigation(),
    page.click("#mainContent_homeContent_btnSearch"),
  ]);

  while (true) {
    const elements = await page.$$(
      "td[id^='mainContent_homeContent_ugGreatWalkGrid_ct']"
    );

    let numOfDaysAvailable = 0;
    for (const e of elements) {
      const title = await e.getAttribute("title");

      // This means we have reached end of booking season (there is a chance there are
      // some dates the huts are available on this page, can improve this if needed)
      if (title === null || title === undefined || title === "") {
        expect("We have reached the end").toBe("Try again some other time");
      }

      const numAvailable = title.split(" ").at(-1);

      if (parseInt(numAvailable) > numOfPeople) {
        numOfDaysAvailable++;
      }
    }

    // super naive check for now. If there are atleast two slots available, get a human to check
    if (numOfDaysAvailable >= 2) {
      break;
    }

    // go to the next page
    await Promise.all([
      page.waitForNavigation(),
      page.click("#mainContent_homeContent_NextDays i"),
    ]);
  }

  // if we get here it means it found at least two slots.
  await page.screenshot({ path: "screenshot.png", fullPage: true });
  const screenshotFilePath = process.cwd() + "/screenshot.png";

  const pushbulletApi = new PushBullet(pushbulletApiKey);
  await pushbulletApi.file(null, screenshotFilePath, "Found some slots!");
});
