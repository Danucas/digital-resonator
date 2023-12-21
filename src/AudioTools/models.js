import { readComponentSettings, saveComponentSettings } from "../db/LocalStorage"
import { gainEnvelop } from "./envelop"
import { LFOTunner } from "../AudioApp/configuration/LFOTunner";
import { ReverbSettings } from "../AudioApp/configuration/Settings";
import { EnvSettings } from "../AudioApp/configuration/Settings";

const TrackModel = (tone=440) => {
    return {
        tone: tone,
        label: null,
        seconds: [],
        settings: {
            nodes: [],
            waves: [
                {
                    wave: 'sine',
                    frequency: 440
                }
            ],
            gain: 1
        }
    }
}


const SynthModel = () => {
    return {
        name: 'Synth-1',
        id: crypto.randomUUID(),
        settings: {
            nodes: [],
            gain: 1,
            pitch: 0,
            windowPosition: {
                x: 24,
                y: 24
            }
        },
        tracks: []
    }
}




const NewTrackModel = () => {
    return {
        tone: 1,
        seconds: [],
        settings: {
            waves: [
                {
                    wave: 'sine',
                    frequency: 1
                }
            ],
            gain: 1,
            nodes: []
        }
    }
}



class BaseComponent {
    constructor(id) {
        this.id = id;
        this.oscillators = [];
        this.context = null;

        this.input = null;
        this.inline = null;
        this.outline = null;
        this.output = null;
    }

    setContext(context) {
        this.context = context;
    }

    tic() {

    }
    readSettings() {
        if (!this.id) {
            this.settings = this.model();
            this.id = this.settings.id;
            saveComponentSettings(this.id, this.settings);
        } else {
            this.settings = readComponentSettings(this.id);
        }
        
    }

    stop() {
        for (let oscillator of this.oscillators) {
            try {
                oscillator.stop();
            } catch(err) {
                console.log(err);
            }
        }
    }

    bridge(input) {
        input.connect(this.inline);
        this.input = input;
    }

    connect(output) {
        if (output.constructor.name == 'GainNode') {
            this.outline.connect(output);
            return;
        }
        if (!output.inline) {
            output.inline = this.outline;
            output.outline = this.outline;
            return;
        }
        this.outline.connect(output.inline);
    }
}


class LFO extends BaseComponent {
    constructor(id) {
        super(id);
        this.model = models['LFO'].model;
        this.readSettings();
    }

    initialize() {
        let lfoOs = this.context.createOscillator();
        lfoOs.type = this.settings.wave;
        lfoOs.frequency.value = this.settings.frequency;

        this.inline = this.context.createGain();
        this.outline = this.inline;
        
        this.inline.gain.value = 1;

        lfoOs.connect(this.inline.gain);
        lfoOs.start();
        this.oscillators.push(lfoOs);
    }

}

class ADSR extends BaseComponent {
    constructor(id) {
        super(id);
        this.model = models['ADSR'].model;
        this.readSettings();
    }

    initialize() {
        this.inline = null;
        this.outline = null;
    }


    bridge(input) {
        this.inline = input;
        this.outline = input;
    }

    tic(parameters) {
        this.gainEnvelop(
            this.context.currentTime,
            parameters.duration / 1000,
            this.settings,
            this.outline,
            this.context
        );
    }

    gainEnvelop(when, duration, env, gainNode, ctx) {
        let commonFactor = duration;
        let A = Number(env.attack);
        let H = Number(env.hold);
        let D = Number(env.decay);
        let S = Number(env.sustain);
        let R = Number(env.release);
    
        let base = A + H + D + S + R;
        let basePorcentaje = 100;
    
        A = ((A * basePorcentaje / base) /100) * commonFactor;
        H = ((H * basePorcentaje / base) /100) * commonFactor;
        D = ((D * basePorcentaje / base) /100) * commonFactor;
        // S = ((S * basePorcentaje / base) /100) * commonFactor;
        R = ((R * basePorcentaje / base) /100) * commonFactor;
        
        gainNode.gain.cancelScheduledValues(0);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.setValueCurveAtTime(new Float32Array([0, 1]), when, A);
        gainNode.gain.setValueCurveAtTime(new Float32Array([1, S]), when + A + H, D);
        gainNode.gain.setValueCurveAtTime(new Float32Array([S, 0]), when + duration, R);
    }


}

class Reverb extends BaseComponent {
    constructor(id) {
        super(id);
        this.model = models['Reverb'].model;
        this.readSettings();
    }

    initialize() {
        this.inline = this.context.createConvolver();
        this.outline = this.inline;
    }

    tic(parameters) {
        let buffer, decay;
        try {
            [buffer, decay] = this.impulseResponse(
                Number(parameters.duration) / 1000,
                Math.round(Number(this.settings.decay)),
                false
            );
            this.inline.buffer = buffer;
        } catch(e) {
            console.log(e)
        }
    }

    impulseResponse(duration, decay, reverse) {
        let sampleRate = this.context.sampleRate;
        let length = Math.round(sampleRate * duration);
        let impulse = this.context.createBuffer(2, length, sampleRate);
        let impulseL = impulse.getChannelData(0);
        let impulseR = impulse.getChannelData(1);
        if (!decay) {
            decay = 2.0
        }
        let sum = 0;
        for (let i=0; i < length; i++) {
            let n = reverse ? length - i : i;
            let time = Math.pow(1 -n / length, duration * decay)
            impulseL[i] = (Math.random() * 2 -1) * time;
            impulseR[i] = (Math.random() * 2 -1) * time;
            sum = sum + time;
        }
        return [impulse, sum]
    }
}



let models = {
    'LFO': {
        model: ()=>({
            id: crypto.randomUUID(),
            wave: 'sine',
            frequency: 10,
            type: 'LFO'
        }),
        component: LFO,
        editor: LFOTunner
    },
    'ADSR': {
        model: ()=>({
            id: crypto.randomUUID(),
            attack: 1,
            hold: 1,
            decay: 0.3,
            sustain: 0.3,
            release: 0.3,
            type: 'ADSR'
        }),
        component: ADSR,
        editor: EnvSettings
    },
    'Reverb': {
        model: ()=>({
            id: crypto.randomUUID(),
            status: false,
            decay: 1,
            type: 'Reverb'
        }),
        component: Reverb,
        editor: ReverbSettings
    }
}



export {
    TrackModel,
    NewTrackModel,
    models,
    SynthModel
}