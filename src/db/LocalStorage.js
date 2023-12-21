function readProject(id) {
    let project = localStorage.getItem(id);
    return JSON.parse(project);
}

function saveProject(id, data) {
    localStorage.setItem(id, JSON.stringify(data));
}

function readProjectTracks(id) {
    let tracks = localStorage.getItem(id + '-tracks');
    return JSON.parse(tracks);
}

function saveProjectTracks(id, data) {
    localStorage.setItem(id + '-tracks', JSON.stringify(data));
}

function updateProjectSettings(projectID, settingName, settingsValue) {
    let project = readProject(projectID);

    if (!project.settings) {
        project['settings'] = {};
    }
    project['settings'][settingName] = settingsValue;

    saveProject(projectID, project);
}

function updateTrackSettings(projectID, trackIndex, settingName, settingsValue) {
    let tracks = readProjectTracks(projectID);
    tracks[trackIndex]['settings'][settingName] = settingsValue;
    saveProjectTracks(projectID, tracks);
}

function getTrackSettings(projectID, trackIndex) {
    let tracks = readProjectTracks(projectID);
    return tracks[trackIndex];
}

function saveComponentSettings(id, settings) {
    let oldSettings = localStorage.getItem('components');
    if (!oldSettings) {
        localStorage.setItem('components', {});
        oldSettings = {}
    } else {
        oldSettings = JSON.parse(oldSettings);
    }

    oldSettings[id] = settings;
    localStorage.setItem('components', JSON.stringify(oldSettings));
}

function readComponentSettings(id) {
    let settings = localStorage.getItem('components');
    if (settings && id in JSON.parse(settings)) {
        return JSON.parse(settings)[id];
    }
}

function getComponents() {
    let settings = localStorage.getItem('components');
    if (!settings) {
        return {}
    } else {
        return JSON.parse(settings);
    }
}

function getSynths() {
    let synths = localStorage.getItem('synths');
    if (synths) {
        return JSON.parse(synths);
    }
    return
}

function getSynthProperties(id) {
    let synth = localStorage.getItem(`synth-${id}`);
    if (synth) {
        return JSON.parse(synth);
    }
    return
}

function saveSynthProperties(id, data) {
    let localstorageKey = `synth-${id}`
    let synth = localStorage.getItem(localstorageKey);
    if (!synth) {
        let synths = localStorage.getItem('synths');
        if (synths) {
            synths = JSON.parse(synths);
        } else {
            synths = [];
        }
        synths.push(id);
        localStorage.setItem('synths', JSON.stringify(synths));
        localStorage.setItem(localstorageKey, JSON.stringify(data));
    }
}

function saveSynthTracks(synthID, tracks, trackID=crypto.randomUUID()) {
    let synthTracks = localStorage.getItem(`${synthID}-tracks`);
    if (synthTracks) {
        synthTracks = JSON.parse(synthTracks);
    } else {
        synthTracks = {}
    }

    synthTracks[trackID] = tracks;
    localStorage.setItem(`${synthID}-tracks`, JSON.stringify(synthTracks));
}

function getSynthTracks(synthID) {
    let synthTracks = localStorage.getItem(`${synthID}-tracks`);
    if (synthTracks) {
        return JSON.parse(synthTracks);
    }
}

function saveRecentAssets(asset, blob) {
    let recentAssets = localStorage.getItem('assets');
    if (!recentAssets) {
        recentAssets = [];
    } else {
        recentAssets = JSON.parse(recentAssets);
    }

    if (!recentAssets.includes(asset.id)) {
        recentAssets.push(asset.id);
        localStorage.setItem(`asset-${asset.id}`, JSON.stringify(asset));
        localStorage.setItem(`asset-${asset.id}-blob`, blob);
    }
    localStorage.setItem('assets', JSON.stringify(recentAssets));
}

function getRecentAssets() {
    let recentAssets = localStorage.getItem('assets');
    if (recentAssets) {
        return JSON.parse(recentAssets);
    }
}

function getAsset(id) {
    let asset = localStorage.getItem(`asset-${id}`);
    let assetBlob = localStorage.getItem(`asset-${id}-blob`);
    if (asset) {
        return [JSON.parse(asset), assetBlob];
    }
}


export {
    saveRecentAssets,
    getRecentAssets,
    getAsset,
    readProject,
    saveProject,
    readProjectTracks,
    saveProjectTracks,
    updateProjectSettings,
    updateTrackSettings,
    getTrackSettings,
    readComponentSettings,
    saveComponentSettings,
    getComponents,
    getSynths,
    saveSynthProperties,
    getSynthProperties,
    saveSynthTracks,
    getSynthTracks
}