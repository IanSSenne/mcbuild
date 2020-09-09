const fetch = require("node-fetch");
const download = require("download");
const { performance } = require("perf_hooks");
const fs = require("fs");
const path = require("path");
const logger = require("./log");
const SAVE_DIR = path.resolve(process.cwd(), "./.mcproject");
const LOCAL_DIR = path.resolve(process.env.APPDATA, 'mc-build', 'local');
fs.mkdirSync(LOCAL_DIR, { recursive: true });
const PROJECT_LOC = path.resolve(SAVE_DIR, 'PROJECT.json');
let manifest = {
    languages: [
        {
            name: "lang-mc/stable",
            remote: {
                type: "github",
                owner: "mc-build"
            },
            options: {
                logging: "all",
            }
        }
    ]
};
if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR);
}
if (fs.existsSync(PROJECT_LOC)) {
    manifest = JSON.parse(fs.readFileSync(PROJECT_LOC, 'utf-8'));
} else {
    fs.writeFileSync(PROJECT_LOC, JSON.stringify(manifest, null, 2));
}
(async () => {
    const promises = manifest.languages.map((language) => {
        switch (language.remote.type) {
            case "github": {
                let [name, version] = language.name.split("/");
                version = version || "stable";
                return fetch(`https://api.github.com/repos/${language.remote.owner}/${name}/branches/${version}`)
                    .then((res) => res.json())
                    .then((data) => {
                        return {
                            _raw: data,
                            sha: data.commit.sha,
                            lang: language
                        }
                    });
            }
        }
    });
    const download_tasks = [];
    (await Promise.all(promises)).forEach((lang) => {
        if (!fs.existsSync(path.resolve(LOCAL_DIR, lang.sha))) {
            download_tasks.push(lang);
        }
    });
    for (let i = 0; i < download_tasks.length; i++) {
        const task = download_tasks[i];
        if (!fs.existsSync(path.resolve(LOCAL_DIR))) {
            fs.mkdirSync(path.resolve(LOCAL_DIR));
        }
        if (!fs.existsSync(path.resolve(LOCAL_DIR, '.cache'))) {
            fs.mkdirSync(path.resolve(LOCAL_DIR, '.cache'));
        }
        const lang = task.lang;

        const start = performance.now();
        if (lang.remote.type === "github") {
            let [name, version] = task.lang.name.split("/");
            const SHA_PATH = path.resolve(LOCAL_DIR, 'sha1', name);
            if (fs.existsSync(path.resolve(path.resolve(SHA_PATH, version + ".sha")))
                && task.sha === fs.readFileSync(path.resolve(SHA_PATH, version + ".sha"), "utf-8")
            ) {
                logger.log("using cached language for '" + task.lang.name + "'");
            } else {

                version = version || "stable";
                logger.info(`downloading language ${name} branch ${version} from '${`https://github.com/${task.lang.remote.owner}/${name}/archive/${task.sha}.zip'`}`)
                await download(
                    `https://github.com/${task.lang.remote.owner}/${name}/archive/${task.sha}.zip`,
                    path.resolve(LOCAL_DIR, '.cache', name, version),
                    {
                        extract: true,
                        "strip": 1
                    }
                );
                if (!fs.existsSync(SHA_PATH)) {
                    fs.mkdirSync(SHA_PATH, { recursive: true });
                }
                fs.writeFileSync(path.resolve(SHA_PATH, version + ".sha"), task.sha);
                const end = performance.now();
                logger.info(`finished download in ${end - start}ms`)
            }
        }

    }
    logger.log("starting mc-build...");
    require("./secondary_entry");
})();