import React from "react";
import { LFOTunner } from "./LFOTunner";
import './Settings.css';
import { waves } from "../../AudioTools/chords";
import { Knob } from "./components/Knob";
import {
    updateTrackSettings,
    getComponents,
    readComponentSettings,
    getTrackSettings, 
    saveComponentSettings 
} from "../../db/LocalStorage";
import { models } from "../../AudioTools/models";
import { WaveFormSelector } from "./components/WaveForm";

class GainSettings extends React.Component {
    constructor(props) {
        super(props);
        this.input = props.input;
        this.state = {
            gain: props.settings
        }
    }

    updateState(value) {
        this.input.updateSettings('gain', value);
        this.setState(() => ({ gain: value }));
    }

    save() {
        this.input.updateSettings('gain', this.state.gain);
    }

    render() {
        let component = this;

        return (
            <>
                
                <div className="lfo-tunner-container">
                        <Knob
                            label='Gain'
                            min={0}
                            max={4}
                            value={this.state.gain}
                            step={0.2}
                            update={(value)=>{
                                component.updateState(value);
                            }}
                        ></Knob>
                </div>
            </>
        )
    }
}


class Waves extends React.Component {
    constructor(props) {
        super(props);
        this.input = props.input;
        this.remove = props.remove;
        console.log(props);
        this.state = {
            waves: props.settings
        }
    }

    updateWave(index, param, value) {
        let waves = this.state.waves;
        waves[index][param] = value;
        this.input.updateSettings('waves', waves);
        this.setState(() => ({ waves: waves }));
    }

    render() {
        return (
            <>
                
                <div className="lfo-tunner-container">
                    <div>
                        <p>Waveforms</p>
                        <WaveFormSelector
                            value={this.state.waves[0].wave}
                            update={(value)=>{
                                this.updateWave(0, 'wave', value);
                            }}>
                        </WaveFormSelector>
                    </div>
                        <Knob
                            label="Frequency"
                            min={0}
                            max={1000}
                            step={1}
                            value={this.state.waves[0].frequency}
                            update={(value)=>{
                                this.updateWave(0, 'frequency', value);
                            }}
                            ></Knob>
                </div>
            </>
            
        )
    }
}


class EnvSettings extends React.Component {
    constructor(props) {
        super(props);
        this.input = props.input;
        this.remove = props.remove;
        this.state = {
            settings: props.settings
        }
    }

    updateState(key, value) {
        let settings = this.state.settings;
        settings[key] = value;
        saveComponentSettings(this.state.settings.id, settings);

        this.setState(() => ({ settings: settings }));
    }

    save() {
        this.input.updateSettings('env', this.state.settings);
    }

    render() {
        return (
            <>
                <div className="lfo-tunner-container">
                    <p>ADSR</p>
                    <button 
                        className="icon icon-close-settings"
                        onClick={()=>this.remove(this.state.settings.id)}
                    ></button>
                    <div style={{display: 'flex'}}>
                        <Knob
                            label="Attack"
                            min={0.1}
                            max={2}
                            step={0.2}
                            value={this.state.settings.attack}
                            update={(value)=>{
                                this.updateState('attack', value);
                            }}
                        ></Knob>
                        <Knob
                            label="Hold"
                            min={0.1}
                            max={2}
                            step={0.2}
                            value={this.state.settings.hold}
                            update={(value)=>{
                                this.updateState('hold', value);
                            }}
                        ></Knob>
                        <Knob
                            label="Decay"
                            min={0.1}
                            max={2}
                            step={0.2}
                            value={this.state.settings.decay}
                            update={(value)=>{
                                this.updateState('decay', value);
                            }}
                        ></Knob>
                    </div>
                    <div style={{display: 'flex'}}>
                        <Knob
                            label="Sustain"
                            min={0.1}
                            max={2}
                            step={0.2}
                            value={this.state.settings.sustain}
                            update={(value)=>{
                                this.updateState('sustain', value);
                            }}
                        ></Knob>
                        <Knob
                            label="Release"
                            min={0.1}
                            max={2}
                            step={0.2}
                            value={this.state.settings.release}
                            update={(value)=>{
                                this.updateState('release', value);
                            }}
                        ></Knob>
                    </div>
                </div>
            </>
        )
    }
}

class ReverbSettings extends React.Component {
    constructor(props) {
        super(props);
        this.input = props.input;
        this.remove = props.remove;
        this.state = {
            settings: props.settings
        }
    }

    updateState(key, value) {
        let settings = this.state.settings;
        settings[key] = value;
        // this.input.updateSettings('reverb', settings);
        saveComponentSettings(this.state.settings.id, settings);
        this.setState(() => ({ settings: settings }));
    }

    save() {
        this.input.updateSettings('reverb', this.state.settings);
    }

    render() {
        return (
            <>
                
                <div className="lfo-tunner-container">
                    <button 
                        className="icon icon-close-settings"
                        onClick={()=>this.remove(this.state.settings.id)}
                    ></button>
                    

                    <div style={{display: 'block'}}>
                        <p>Reverb</p>
                        <Knob
                            label="Decay"
                            min={0}
                            max={10}
                            step={0.1}
                            value={this.state.settings.decay}
                            update={(value)=> {
                                this.updateState('decay', value);
                            }}
                        ></Knob>
                    </div>
                </div>
            </>
        )
    }
}




const FILTERS_MAP = {
    'gain': {
        label: 'Gain',
        component: GainSettings
    },
    'waves': {
        label: 'Waves',
        component: Waves
    },
    'lfo': {
        label: 'Low Frequency Oscillator',
        component: LFOTunner,
    },
    'env': {
        label: 'Envelop',
        component: EnvSettings
    },
    'reverb': {
        label: 'Reverb',
        component: ReverbSettings
    }
}



class ComponentController extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selected: 'LFO'
        }


    }

    addComponent(componentName) {
        let ComponentInstance = new models[componentName].component();
        console.log(ComponentInstance);
        this.setState(() => ({}));
    }

    render() {
        return (
            <div className="components-container">
                <p>Created components</p>
                <div className="created-components">
                    {
                        Object.entries(getComponents()).map(([compName, settings]) => {
                            return (
                                <div className="component-item">
                                    <p>{settings.type}{' '}
                                        <span>{compName.split('-')[0]}</span>
                                    </p>
                                </div>
                            );
                        })
                    }
                </div>
                <br></br>
                <p>Add new Component</p>
                <div className="components-list">
                    {
                        Object.entries(models).map(([componentName, configuration]) => {
                            return (
                                <div className="component-item">
                                    <p onClick={
                                        (e) => this.addComponent(componentName)}>
                                        {componentName}</p>
                                </div>
                            )
                        })
                    }
                </div>

            </div>
        );
    }
}


class TrackSettingsEditor extends React.Component {
    constructor(props) {
        super(props);
        this.settings = props.settings;
        this.index = props.index;
        this.projectId = props.projectId;
        this.input = props.input;
        this.state = {
            map: 'waves',
            addComponent: false,
            component: null
        }
    }

    close() {
        this.input.closeAlert();
    }

    openSettings(componentId) {
        this.setState(() => ({ component: componentId, map: null }));
    }

    updateSettings(key, value) {
        updateTrackSettings(this.projectId, this.index, key, value);
    }

    addNode(nodeId) {
        let settings = getTrackSettings(this.projectId, this.index);
        if (!settings.settings.nodes) {
            settings.settings['nodes'] = []
        }
        settings.settings['nodes'].push(nodeId);
        this.updateSettings('nodes', settings.settings['nodes'])
        this.setState(() => ({}));
    }

    removeComponent(componentId) {
        let settings = getTrackSettings(this.projectId, this.index);
        let index = settings.settings.nodes.indexOf(componentId);
        settings.settings.nodes.splice(index, 1);
        this.updateSettings('nodes', settings.settings.nodes);
        this.setState(() => ({}));
    }

    renderComponentsList() {
        return (
            <div className="created-components">
                {
                    Object.entries(getComponents()).map(([compName, settings]) => {
                        return (
                            <div className="component-item"
                                onClick={() => this.addNode(compName)}>
                                <p>{settings.type}{' '}
                                    <span>{compName.split('-')[0]}</span>
                                </p>
                            </div>
                        );
                    })
                }
            </div>
        )
    }

    render() {
        let filterView;


        if (this.state.map) {
            let InputComponent = FILTERS_MAP[this.state.map].component;
            console.log(this.settings);
            filterView = (<InputComponent key={crypto.randomUUID()} input={this} settings={this.settings[this.state.map] || {}}></InputComponent>);
        } else if (this.state.component) {
            let componentSettings = readComponentSettings(this.state.component);
            let Component = models[componentSettings.type].editor;
            filterView = (<Component input={this} settings={componentSettings}></Component>);
        }

        let settings = getTrackSettings(this.projectId, this.index).settings;
        return (
            <div className="track-settings-container">
                <button onClick={() => this.setState((p) => ({ addComponent: !p.addComponent }))}>Add to pipe</button>
                {this.state.addComponent && this.renderComponentsList()}
                <div className="settings-tabs">
                    <div className={"tab-container" + (this.state.map == 'gain' ? ' active' : '')}
                    onClick={() => this.setState(() => ({ map: 'gain', component: null }))}>
                        <p 
                            >Gain</p>
                    </div>
                    <div className={"tab-container" + (this.state.map == 'waves' ? ' active' : '')}
                    onClick={() => this.setState(() => ({ map: 'waves', component: null }))}>
                        <p>Waveforms</p>
                    </div>
                    
                    {
                        settings.nodes && settings.nodes.map((componentId) => {
                            let comp = readComponentSettings(componentId);
                            return (
                                <div className={"tab-container" + (this.state.component == componentId ? ' active' : '')}
                                onClick={() => this.openSettings(componentId)}>
                                    <p 
                                    >{comp.type}</p>
                                    <button className="icon icon-delete-settings-tab" onClick={()=>this.removeComponent(componentId)}>x</button>
                                </div>
                                
                            )
                        })
                    }
                </div>

                {filterView}
                <button onClick={() => this.close()}>close</button>
            </div>
        )
    }
}


class TrackSettings extends React.Component {
    constructor(props) {
        super(props);
        this.settings = props.settings;
        this.index = props.index;
        this.projectId = props.projectId;
        this.input = props.input;
        this.state = {
            map: 'waves',
            addComponent: false,
            component: null,
            position: {
                x: 50,
                y: 120
            }
        }
    }

    close() {
        this.input.closeAlert();
    }
    openSettings(componentId) {
        this.setState(() => ({ component: componentId, map: null }));
    }

    updateSettings(key, value) {
        updateTrackSettings(this.projectId, this.index, key, value);
    }

    addNode(nodeId) {
        let settings = getTrackSettings(this.projectId, this.index);
        if (!settings.settings.nodes) {
            settings.settings['nodes'] = []
        }
        settings.settings['nodes'].push(nodeId);
        this.updateSettings('nodes', settings.settings['nodes'])
        this.setState(() => ({}));
    }

    removeComponent(componentId) {
        let settings = getTrackSettings(this.projectId, this.index);
        let index = settings.settings.nodes.indexOf(componentId);
        settings.settings.nodes.splice(index, 1);
        this.updateSettings('nodes', settings.settings.nodes);
        this.setState(() => ({}));
    }

    renderComponentsList() {
        return (
            <div className="created-components">
                {
                    Object.entries(getComponents()).map(([compName, settings]) => {
                        return (
                            <div className="component-item"
                                onClick={() => this.addNode(compName)}>
                                <h2>{settings.type}</h2>
                                <p>{compName.split('-')[0]}</p>
                            </div>
                        );
                    })
                }
            </div>
        )
    }

    moveWindow() {
        document.onmousemove = (event) => {
            event.preventDefault();
            console.log(event);
            let y = event.movementY;
            let x = event.movementX;
            this.setState((p)=>({position: {x: p.position.x + x, y: p.position.y + y}}));
        }
        document.onmouseup = (event) => {
            document.onmousemove = null;
        }

    }

    render() {
        let input = this;
        let settings = getTrackSettings(this.projectId, this.index).settings;
        
        let nodes = settings.nodes.map((componentId)=> {
            let componentSettings = readComponentSettings(componentId);
            let Component = models[componentSettings.type].editor;
            return(<Component input={input} remove={(id)=>{this.removeComponent(id)}} settings={componentSettings}></Component>);
        });

        let mainSettings = (
            <>
                <GainSettings
                    key={crypto.randomUUID()}
                    input={input}
                    settings={this.settings.gain}
                ></GainSettings>
                <Waves
                    key={crypto.randomUUID()}
                    input={input}
                    settings={this.settings.waves}
                ></Waves>
            </>
        )
        let blocks = []
        for (let i=0; i <= nodes.length - 1; i=i+2) {
            try {
                blocks.push((
                    <div style={{display: "flex", maxWidth: "100%"}}>
                        {i <= nodes.length - 1 && nodes[i]}
                        {i + 1 <= nodes.length - 1 && nodes[i + 1]}
                    </div>
                ));
            } catch(err) {
                console.log();
            }
            
        };

        return (
            <div className="track-settings-container" style={{top: this.state.position.y, left: this.state.position.x}}>
                <div className="icon icon-grab-window" onMouseDown={()=>this.moveWindow()}></div>
                <button className="icon icon-close-settings" onClick={() => this.close()}></button>
                <div style={{display: "flex", maxWidth: "100%"}}>
                    {mainSettings}
                    <div className="add-component" onClick={() => this.setState((p) => ({ addComponent: !p.addComponent }))}>add </div>
                    {this.state.addComponent && this.renderComponentsList()}
                </div>
                {blocks}
                {/* <div style={{display: "flex", maxWidth: "100%"}}>
                    {nodes}
                </div> */}
            </div>
        );
    }
}

export {
    TrackSettings,
    TrackSettingsEditor,
    ComponentController,
    GainSettings,
    ReverbSettings,
    EnvSettings,
}