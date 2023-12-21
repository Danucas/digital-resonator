import React from "react";
import './Knob.css';

class Knob extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            label: props.label,
            min: props.min,
            max: props.max,
            step: props.step,
            value: props.value,
            update: props.update
        }
    }

    activeKnob() {
        document.onmousemove = (event) => {
            event.preventDefault();
            let newValue = Number(this.state.value) - ((event.movementY / 2) * this.state.step);
            if (newValue > this.state.max) {
                newValue = this.state.max;
            } else if (newValue < this.state.min) {
                newValue = this.state.min;
            }
            newValue = newValue.toFixed(1);
            
            this.state.update(newValue);
            this.setState(() => ({ value: newValue }));
        };
        document.onmouseup = (event) => {
            document.onmousemove = null;
        }
    }


    render() {
        let knobRange = 290;
        let knobStart = -145;
        let percent = (Number(this.state.value) * 100 / this.state.max);
        let knobPosition = knobStart + (knobRange * percent / 100);

        let levelHeight = Math.round(percent * 30 / 100);

        let gradient;

        if (percent > 60) {
            let green = Number(60 * levelHeight / 100); 
            gradient = `linear-gradient(red 0%, green ${green}%)`
        } else {
            gradient = `linear-gradient(green, green)`;
        }

        return (
            <div className="knob-trail">
                <div className="icon icon-knob-trail">
                </div>
                <div className="knob-back">

                </div>
                <div 
                    className="icon icon-knob"
                    onMouseDown={()=>this.activeKnob()}
                    style={{transform: `rotate(${knobPosition}deg)`}}>
                </div>
                <div 
                    className="level-meter" 
                    style={{height: `${levelHeight}px`,
                    backgroundImage: gradient}}></div>
                <p>{this.state.label} ({this.state.value})</p>
            </div>
        );
    }
}

export {
    Knob
}