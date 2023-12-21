import React from "react";
import { waves } from "../../AudioTools/chords";
import './LFOTunner.css';
import { saveComponentSettings } from "../../db/LocalStorage";
import { Knob } from "./components/Knob";
import { WaveFormSelector } from "./components/WaveForm";


class LFOTunner extends React.Component {
    constructor(props) {
        super(props);
        this.input = props.input;
        this.remove = props.remove;
        this.state = {
            settings: props.settings
        }
    }

    updateSettings(key, value) {
        let settings = this.state.settings;
        settings[key] = value;
        // this.input.updateSettings('lfo', settings);
        saveComponentSettings(this.state.settings.id, this.state.settings);

        this.setState(()=>({settings: settings}));
    }

    render() {
        return (
            <>
                <div className="lfo-tunner-container">
                    <div>
                        <p>Low Frequency Oscillator</p>
                        <button 
                            className="icon icon-close-settings"
                            onClick={()=>this.remove(this.state.settings.id)}
                        ></button>
                        <WaveFormSelector
                            value={this.state.settings.wave}
                            update={(value)=>{
                                this.updateSettings('wave', value);
                            }}
                        ></WaveFormSelector>
                    </div>
                        <Knob
                            label="Frequency"
                            min={0}
                            max={220}
                            step={1}
                            value={this.state.settings.frequency}
                            update={(value)=>{
                                this.updateSettings('frequency', value);
                            }}
                        ></Knob>
                </div>
            </>
            
        )
    }
}

export {
    LFOTunner
};