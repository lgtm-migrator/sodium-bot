import * as arg from "arg";
import { basename } from "path";
import { promises as fs } from "fs";
import { TimeoutError } from "selenium-webdriver";
import { Driver } from "selenium-webdriver/chrome";
import { promise, race, after } from "fluture";
import { PageController } from "./";
import Executor from "./utils/executor";
import logger from "./utils/logger";

const { readFile } = fs;
const { SELENIUM_REMOTE_URL } = process.env;

const retry = async (count: number, proc: Function) => {
  for (const i of Array(count).keys()) {
    try {
      return await proc();
    } catch (error) {
      logger.error(error);
      if (i + 1 === count) break;
    }
  }
  throw new Error(`${count} retries.`);
};

/**
 * @param url
 * @param seconds timeout
 */
const play = async (url: URL, seconds: number) => {
  if (SELENIUM_REMOTE_URL == null) {
    throw new Error("SELENIUM_REMOTE_URL required.");
  }

  const executor = new Executor(SELENIUM_REMOTE_URL);
  const session = JSON.parse((await readFile("./session.json")).toString());
  const driver = new Driver(session, executor);
  const page = new PageController({ driver, url });
  const timeoutIn = seconds * 1e3;
  const timeoutAt = Date.now() + timeoutIn;
  const timeout = setTimeout(async () => {
    await page.stop();
    throw new TimeoutError(`${seconds} seconds timeout.`);
  }, timeoutIn);

  try {
    await retry(3, async () => {
      logger.info("Play...");
      await page.screenshot();
      await page.play();
      await page.screenshot();
      await page.waitForSodiumExists(1e3);
      logger.info("Sodium exists.");
      await page.screenshot();
      await page.waitForPlaying(10e3);
      logger.info("Playing.");
      await page.screenshot();
      await page.waitForShowStatus(90e3);
      logger.info("Show status.");
      await page.screenshot();
      await page.waitForShowQuality(30e3);
      logger.info("Show quality.");
      await page.screenshot();
    });
  } catch (error) {
    await page.stop();
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  await promise(
    race(
      after(Math.max(0, timeoutAt - Date.now()), ""),
      page.logger(message => {
        logger.info(message);
        page.screenshot();
      })
    )
  );

  await page.stop();
};

const start = () => {
  const args = arg({
    "-h": "--help",
    "--help": Boolean,
    "-t": "--timeout",
    "--timeout": Number
  });
  const help = args["--help"];
  const timeout = args["--timeout"];

  if (help || !Number.isFinite(timeout)) {
    console.log(
      `Usage: ${process.argv0} ${basename(__filename)} [options] url`
    );
    console.log("Options:");
    console.log(
      [
        "-h, --help              print command line options",
        "-t, --timeout=...       set timeout period (seconds)"
      ].join("\n")
    );
    return;
  }

  // NOTE: Unhandled promise rejection terminates Node.js process with non-zero exit code.
  process.on("unhandledRejection", event => {
    throw event;
  });

  play(new URL(args._[0]), timeout);
};

if (require.main === module) start();