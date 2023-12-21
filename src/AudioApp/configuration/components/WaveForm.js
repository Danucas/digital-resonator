import React from "react";
import './WaveForm.css';

class WaveFormSelector extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            value: props.value,
            update: props.update
        }
    }

    updateWave(value) {
        this.state.update(value);
        this.setState(()=>({value: value}));
    }

    render() {
        return(
            <div className="waveform-select">
                <div className={"wave-option" + (this.state.value=='sine' ? ' active' : '')} onClick={()=>this.updateWave('sine')}>
                    <h1 className="icon icon-sine-wave"></h1>
                    <p>sine</p>
                </div>
                <div className={"wave-option" + (this.state.value=='square' ? ' active' : '')} onClick={()=>this.updateWave('square')}>
                    <h1 className="icon icon-square-wave"></h1>
                    <p>square</p>
                </div>
                <div className={"wave-option" + (this.state.value=='triangle' ? ' active' : '')} onClick={()=>this.updateWave('triangle')}>
                    <h1 className="icon icon-triangle-wave"></h1>
                    <p>triangle</p>
                </div>
                <div className={"wave-option" + (this.state.value=='sawtooth' ? ' active' : '')} onClick={()=>this.updateWave('sawtooth')}>
                    <h1 className="icon icon-sawtooth-wave"></h1>
                    <p>sawtooth</p>
                </div>
            </div>
        );
    }
}

export {
    WaveFormSelector
}