import { readComponentSettings, readProjectTracks } from '../db/LocalStorage';
import { sleep } from '../utilities/utils';
import { models } from './models';

class BaseTrack {
    constructor(projectID, toneIndex) {
        this.projectID = projectID;
        this.toneIndex = toneIndex;
        this.readConfig();
    }

    setDestination(destination) {
        this.destination = destination;
    }

    updateConfig() {

    }

    readConfig() {

    }
}

class ToneTrack {
    constructor(index, projectID, audioContext, track) {
        this.index = index;
        this.projectID = projectID;
        this.tone = track.tone;
        this.destination = null;
        this.settings = track.settings;
        this.seconds = track.seconds;
        this.destination = null;
        this.oscillator = null;
        this.out = null;
        this.audioContext = audioContext;
    }

    readSettings() {
        this.settings = readProjectTracks(this.projectID)[this.index].settings;
    }

    setDestination(destination) {
        this.destination = destination;
    }

    initialize() {
        console.log('Init Oscillator', this.tone);
        try {
            this.oscillator = this.audioContext.createOscillator();

            let outputGain = this.audioContext.createGain();
            outputGain.gain.setValueAtTime(this.settings.gain, 0);
            this.oscillator.connect(outputGain);
            this.out = outputGain;

            this.oscillator.type = this.settings.waves[0].wave;
            this.oscillator.frequency.setValueAtTime(this.tone, this.audioContext.currentTime);
            this.oscillator.start();
        } catch (err) {
            console.log(err)
        }
    }

    updateSettings(settings) {
        this.settings = settings;
    }

    async tick(second, duration) {
        if (this.seconds.includes(second)) {
            this.readSettings();
            console.log('Tic', this.tone, second, duration);
            this.initialize();

            if (this.settings.nodes) {
                let components = [];
                let lastNode = null;
                for (let node of this.settings.nodes) {
                    let compSettings = readComponentSettings(node);
                    let ComponentInstance = new models[compSettings.type].component(node);
                    ComponentInstance.setContext( this.audioContext);
                    ComponentInstance.initialize();
                    components.push(ComponentInstance);
                    lastNode = ComponentInstance;
                }

                if (components && components.length > 0) {
                    console.log(components);
                    components[0].bridge(this.out);

                    for (let index = 0; index < components.length - 1; index++) {
                        let comp = components[index];
                        if (index < components.length - 1) {
                            let nextComponent = components[index + 1];
                            console.log(comp, nextComponent);
                            comp.connect(nextComponent);

                            nextComponent = components[index + 1];
                            console.log(comp.model().type, ' -> ', nextComponent.model().type);
                        }
                    }
                    components[components.length - 1].connect(this.destination);

                    components.forEach((comp)=> {
                        comp.tic({
                            duration: duration
                        });
                    });

                    console.log(components);
                } else {
                    this.out.connect(this.destination);
                }
                
            } else {
                this.oscillator.connect(this.out);
                this.out.connect(this.destination);
            }
        }
        await sleep(duration);
        this.stop();
    }

    async stop() {
        console.log('Stop oscillator', this.tone);
        try {
            this.oscillator.stop();
        } catch(e) {
            console.log('no oscillator')
        }
        try {
            this.oscillator.disconnect();
        } catch(e) {
            console.log('cant disconnect')
        }
    }

}


class Tracks {
    constructor(tracks) {
        this.tracks = tracks;
    }

    async tic(second, bitsize) {
        for (let track of this.tracks) {
            track.tick(second, bitsize);
        }
    }

    async stop() {
        for (let track of this.tracks) {
            await track.stop();
        }
    }

}

export {
    Tracks,
    ToneTrack
}