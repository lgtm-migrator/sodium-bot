const arg = require("arg");
const assert = require("assert");
const { HttpClient, Executor } = require("selenium-webdriver/http");
const { Driver } = require("selenium-webdriver/chrome");

const { SELENIUM_REMOTE_URL } = process.env;
Object.entries({ SELENIUM_REMOTE_URL }).forEach(([env, value]) => {
  assert(value != null, `${env} required.`);
});

const play = async () => {
  const args = arg({
    "-h": "--help",
    "--help": Boolean,
    "-t": "--timeout",
    "--timeout": Number
  });
  const help = args["--help"];
  const timeout = args["--timeout"];

  if (help || !Number.isFinite(timeout)) {
    const { basename } = require("path");
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

  const url = new URL(args._[0]);

  const client = new HttpClient(SELENIUM_REMOTE_URL);
  const executor = new Executor(client);
  const driver = new Driver(require("./session.json"), executor);

  driver.get(url);

  await driver.sleep(timeout * 1e3);
  await driver.get("about:blank");
};

if (require.main === module) play();
