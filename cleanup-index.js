const fs = require("fs");
const path = require("path");
const toml = require(process.argv[4]);

const clone = process.argv[2];
const configPath = process.argv[3];
const parsed = toml.parse(fs.readFileSync(configPath, "utf8"));
const pkgs = Array.isArray(parsed.package) ? parsed.package : [];
let removed = 0;

function rmEmpty(dir, stop) {
  let cur = dir;
  while (cur && cur.startsWith(stop) && fs.existsSync(cur)) {
    if (fs.readdirSync(cur).length > 0) break;
    fs.rmdirSync(cur);
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
}

for (const p of pkgs) {
  const [scope, name] = String(p.name || "").split("/");
  const version = String(p.version || "");
  if (!scope || !name || !version) continue;

  const indexPath = path.join(clone, "index", scope, `${name}.json`);
  let artifactRel = `packages/${scope}/${name}/${version}.tar.gz`;
  let touched = false;

  if (fs.existsSync(indexPath)) {
    const data = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    if (data && data.versions && Object.prototype.hasOwnProperty.call(data.versions, version)) {
      const meta = data.versions[version];
      if (meta && typeof meta.artifact === "string" && meta.artifact.trim() !== "") {
        artifactRel = meta.artifact.trim();
      }
      delete data.versions[version];
      touched = true;

      if (Object.keys(data.versions).length === 0) {
        fs.unlinkSync(indexPath);
        rmEmpty(path.dirname(indexPath), path.join(clone, "index"));
      } else {
        fs.writeFileSync(indexPath, JSON.stringify(data, null, 2) + "\n", "utf8");
      }
    }
  }

  const artifactPath = path.join(clone, ...artifactRel.split("/"));
  if (fs.existsSync(artifactPath)) {
    fs.unlinkSync(artifactPath);
    touched = true;
    rmEmpty(path.dirname(artifactPath), path.join(clone, "packages"));
  }

  if (touched) {
    removed += 1;
  }
}

console.log(`REMOVED_ENTRIES=${removed}`);