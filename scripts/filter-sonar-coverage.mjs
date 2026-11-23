// LCOV is measured on the tested merge, while Sonar analyzes the PR head.
// Never attach line numbers from a different version of a file.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const report = "coverage/lcov.info";
const tested = process.env.GITHUB_SHA;
if (tested && existsSync(report)) {
  const different = new Set(
    execFileSync(
      "git",
      ["diff", "--name-only", "--no-renames", "-z", tested, "HEAD"],
      { encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean),
  );
  const records = readFileSync(report, "utf8")
    .split("end_of_record\n")
    .filter(Boolean);
  const kept = records.filter((record) => {
    const match = /^SF:(.*)$/m.exec(record);
    return match && !different.has(match[1]);
  });
  writeFileSync(
    report,
    kept.length ? `${kept.join("end_of_record\n")}end_of_record\n` : "",
  );
  if (kept.length !== records.length) {
    console.log(
      `::warning::Omitted ${records.length - kept.length} coverage files that differ between the tested merge and PR head. Update the branch to include its base for matching results.`,
    );
  }
}
