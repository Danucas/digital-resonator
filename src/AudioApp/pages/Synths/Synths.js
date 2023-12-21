import React from "react";
import './Synths.css';
import { Knob } from "../../configuration/components/Knob";
import { chords } from "../../../AudioTools/chords";
import { TrackModel } from "../../../AudioTools/models";
import { SynthPlayer } from "../../../AudioTools/WebAudioApiControllers";
import { sleep } from "../../../utilities/utils";
import { getComponents, getSynthProperties, getSynths, saveSynthProperties, saveSynthTracks, getSynthTracks } from "../../../db/LocalStorage";
import { SynthModel } from "../../../AudioTools/models";


let keyboardMap = {
    'a': 0,
    'w': 1,
    's':2,
    'e': 3,
    'd': 4,
    'f': 5,
    't': 6,
    'g': 7,
    'y': 8,
    'h': 9,
    'u': 10,
    'j': 11,
    'i': 12,
    'k': 14,
    'o': 16,
    'l': 17,
    'p': 19,
    'ñ': 21, 
}


let pressed = [];

let pressedQueue = [];




class Synthetizers extends React.Component {
    constructor(props) {
        super(props);
        this.id = props.id;
        this.settings = props.settings;
        this.state = {
            position: {
                x: 24,
                y: 24
            },
            pitch: 4,
            volume: 1,
            tracks: null,
            bpm: 290,
            player: null,
            addComponent: false,
            components: [],
            currentTracksID: undefined,
            savedTracks: true,
            unsaved: false
        }
    }
    
    componentDidMount() {
        window.onkeydown = (event) => {
            event.preventDefault();
            if (!Object.keys(keyboardMap).includes(event.key)) {
                return;
            }
            let keyIndex = keyboardMap[event.key];
            let freq =  this.state.tracks[keyIndex].tone;
            this.playKey(freq);
        }

        window.onkeyup = (event) => {
            if (!Object.keys(keyboardMap).includes(event.key)) {
                return;
            }
            let keyIndex = keyboardMap[event.key];
            let freq =  this.state.tracks[keyIndex].tone;
            
            this.stopKey(freq);
        }
    }

    renderCells(beats, trackIndex=null, header=false) {
        let track;

        if (trackIndex || trackIndex === 0) {
            track = this.state.tracks[trackIndex];
        }
        let cells = [];
        for (let i=1 ;i <= beats + 1; i++) {
            let border = {}
            if (!header && (!((i - 1) % 16))) {
                console.log('borderRight')
                border = {
                    borderLeftColor: 'rgb(80, 80, 80)',
                    borderLeftWidth: '2px'
                }
            }

            let renderContent = () => {
                if ((trackIndex || trackIndex === 0) && this.state.tracks[trackIndex].seconds.includes(i)) {
                    let hslColor = Math.round(trackIndex * 360 / this.state.tracks.length);
                    console.log(hslColor)
                    return <p className="active-cell" style={{
                        backgroundColor: `hsl(${hslColor} 50% 50%)`
                    }}>{this.state.tracks[trackIndex].label}</p>
                }
            }

            cells.push(
                <div
                    className={"key-cell" + (header ? ' header': '')}
                    style={border}
                    onClick={()=>{
                        if (trackIndex || trackIndex === 0) {
                            this.addTrackBeat(trackIndex, i);
                        }
                    }}
                    >
                    {header && (!((i - 1) % 16)) ? Math.round((i / 16) + 1) : ''}
                    { renderContent()}
                </div>
            )
        }
        return cells;
    }

    moveWindow() {
        document.onmousemove = (event) => {
            event.preventDefault();
            console.log(event);
            let y = event.movementY;
            let x = event.movementX;
            
            
            this.setState((p)=>{
                if (p.y + y < 0) {
                    p.y = 24;
                }
                return(
                    {position: {x: p.position.x + x, y: p.position.y + y}}
                )
            });
        }
        document.onmouseup = (event) => {
            document.onmousemove = null;
        }

    }

    getChordsByPitch(pitch=null) {
        if (!pitch) {
            pitch = this.state.pitch;
        }
        let frequencies = Object.entries(chords).filter(([chord, frequency])=>{
            return (chord.includes(Math.round(Number(pitch))));
        });
        let higherfrequencies = Object.entries(chords).filter(([chord, frequency])=>{
            return (chord.includes(Math.round(Number(pitch)) + 1 ));
        });
        frequencies.push(...higherfrequencies);
        console.log(frequencies);
        return frequencies;
    }

    updatePitch(value) {
        let frequencies = this.getChordsByPitch(value);
        let tracks = this.state.tracks;
        tracks.forEach((track, index)=>{
            track.tone = frequencies[index][1];
            track.label = frequencies[index][0];
        })
        this.setState(()=>({tracks: tracks, pitch: value}))
    }

    playKey(freq) {
        function isFrequencyActive(frequency) {
            let skip = false;
            pressedQueue.forEach((p)=>{
                if (p.frequency == frequency) {
                    skip = true;
                }
            });
            return skip
        }

        if (isFrequencyActive(freq)) {
            return
        }

        let eventInstance = {
            id: crypto.randomUUID(),
            frequency: freq
        }

        pressedQueue.push(eventInstance);


        let player = this.state.player;
        let settings = { volume: this.state.volume, bpm: this.state.bpm };
        if (!player) {
            player = new SynthPlayer(this.context, {
                settings: settings
            });
            this.setState(()=>({player: player}));
        }
        player.setSettings(settings);
        player.playKey(eventInstance);
    }

    playLoop() {
        let player = this.state.player;
        let settings = { volume: this.state.volume, bpm: this.state.bpm };
        if (!player) {
            player = new SynthPlayer(this.context, {
                settings: { volume: this.state.volume }
            });
            this.setState(()=>({player: player}));
        }
        player.setSettings(settings);
        player.playLoop(this.state.tracks);
    }

    stopLoop() {
        this.state.player.stopLoop();
    }

    stopKey(freq) {
        let filteredPressed = pressedQueue.filter((q)=>q.frequency == freq);    
        filteredPressed.forEach((p)=>{
            let index = pressedQueue.findIndex((object)=>{
                return object.frequency == p.frequency;
            })
            pressedQueue.splice(index, 1);
            this.state.player.stopKey(p.id);
        });
    }

    generateTracks() {
        let frequencies = this.getChordsByPitch();
        let tracks = frequencies.map(([chord, frequency])=> {
            let model = TrackModel();
            model.tone = frequency;
            model.label = chord;
            return model
        })
        this.setState(()=>({tracks: tracks}));
    }

    async scheduledStop(seconds, frequency) {
        await sleep(seconds * 200);
        this.stopKey(frequency);
    }

    addTrackBeat(trackIndex, beatPosition) {
        let tracks = this.state.tracks;
        if (!tracks[trackIndex].seconds.includes(beatPosition)) {
            tracks[trackIndex].seconds.push(beatPosition);
            let keyID = crypto.randomUUID();
            this.playKey(tracks[trackIndex].tone, keyID);
            this.scheduledStop(1, tracks[trackIndex].tone, keyID);
        } else {
            let remIndex = tracks[trackIndex].seconds.indexOf(beatPosition);
            tracks[trackIndex].seconds.splice(remIndex, 1);
        }
        this.setState(()=>({tracks: tracks, unsaved: true}));
    }

    renderComponentsList() {
        return (
            <div className="created-components synth">
                {
                    Object.entries(getComponents()).map(([compName, settings]) => {
                        return (
                            <div className="component-item synth"
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

    renderAvailableTracks() {
        let tracks = getSynthTracks(this.id);
        console.log(tracks);
        if (tracks && this.state.savedTracks) {
            let listView = Object.entries(tracks).map(([key, trackList])=>{
                return(
                    <div className="track-list-option" onClick={()=>this.setState(()=>(
                        {
                            tracks: trackList,
                            currentTracksID: key,
                            savedTracks: false,
                            unsaved: false
                        }))}>
                        <p>{key.slice(0, 6)} ({trackList.length} tracks)</p>
                    </div>
                )
                
            });
            console.log(listView);
            return (
                <div className="saved-tracks-container">
                    <button className="icon icon-close-settings" onClick={()=>this.setState(()=>({savedTracks: false}))}></button>
                    <h1>Saved tracks</h1>
                    {listView}
                </div>
            );
        }
    }

    saveTracks() {
        saveSynthTracks(this.id, this.state.tracks, this.state.currentTracksID);
        this.setState(()=>({unsaved: false}))
    }

    render() {
        if (!this.state.tracks) {
            this.generateTracks();
            return (<></>);
        }
        let comp = this;
        let keys = [];
        let sharpKeys = [1, 3, 5, 8, 10, 13, 15, 17, 20, 22];
        let keyHeight = 18;
        let length = this.state.tracks.length - 1;
        for (let pos= length; pos >= 0; pos=pos-1) {
            let position = {
                height: `${Math.round(keyHeight)}px`,
                top: `${Math.round((keyHeight * pos) + keyHeight)}px`,
            }
            let keyID = crypto.randomUUID();

            keys.push((
                <button
                 key={crypto.randomUUID()} 
                 className={"key" + (sharpKeys.includes(pos) ? ' sharp': '')}
                 onMouseDown={()=>this.playKey({
                    frequency: this.state.tracks[length - pos].tone,
                    key: null,
                    id: crypto.randomUUID()
                })}
                 onMouseUp={()=>this.stopKey(this.state.tracks[length-pos].tone, keyID)}
                 style={position}
                >{this.state.tracks[length-pos].label}</button>
            ))
        }
        return(
            <div className="synth-interface">
                <div className="keyboard" style={{height: keyHeight * (length + 3), top: this.state.position.y, left: this.state.position.x}}>
                    <div className="icon icon-grab-window" onMouseDown={()=>this.moveWindow()}></div>
                    {this.renderAvailableTracks()}
                    <div className="synth-options">
                        <h1 onClick={()=>this.setState(()=>({savedTracks: true}))}>Tracks</h1>
                        <h1 style={{
                            backgroundColor: this.state.unsaved ? 'green': 'transparent',
                            color: this.state.unsaved ? 'white': 'gray',
                        }} onClick={()=>this.saveTracks()}>{this.state.unsaved ? 'Save Changes': 'No changes'}</h1>
                    </div>
                    <div className="keyboard-controls">
                        <Knob
                            label='pitch'
                            min={0}
                            max={8}
                            step={1}
                            value={this.state.pitch}
                            update={(value)=>{
                                comp.updatePitch(value)
                            }}
                        >
                        </Knob>
                        <Knob
                            label='volume'
                            min={0}
                            max={8}
                            step={1}
                            value={this.state.volume}
                            update={(value)=>{
                                comp.setState(()=>({volume: value}))
                            }}
                        >
                        </Knob>

                        <Knob
                            label='bpm'
                            min={65}
                            max={360}
                            step={1}
                            value={this.state.bpm}
                            update={(value)=>{
                                comp.setState(()=>({bpm: value}))
                            }}
                        >
                        </Knob>
                        <button className="add-synth-component" onClick={()=>this.setState(()=>({addComponent: true}))}>+</button>
                        { this.state.addComponent && this.renderComponentsList() }

                        <button className="icon icon-play" onClick={()=>this.playLoop()}></button>
                        <button className="icon icon-stop" onClick={()=>this.stopLoop()}></button>
                    </div>
                    
                    <div className="keys-container">
                        {keys}
                    </div>
                    <div className="keyframes-container" style={{height: keyHeight * (length + 2.4)}}>
                        {
                            <div className="keyframes-track" style={{height: keyHeight}}>
                                {
                                    this.renderCells(64, null, true)
                                }
                            </div>
                        }
                        {
                            this.state.tracks.map((track, index)=> {
                                let trackIndex = this.state.tracks.length - 1 - index;
                                return(<div className="keyframes-track" style={{height: keyHeight}}>
                                    {
                                        this.renderCells(64, trackIndex, false)
                                    }
                                </div>)
                            })
                        }
                    </div>
                </div>
                
            </div>
        )
    }
}


class SynthMenu extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            synths: null,
            currentSynth: null
        };
    }

    createSynth() {
        let synth = SynthModel();
        saveSynthProperties(synth.id, synth);
        this.getSynths();
    }

    getSynths() {
        let synths = getSynths();
        this.setState(()=>({synths: synths}));
    }

    render() {
        let synths;

        if (this.state.synths) {
            synths = this.state.synths.map((synth)=>{
                let properties = getSynthProperties(synth);
                return (
                    <div className="synth-card" onClick={()=>this.setState(()=>({currentSynth: synth}))}>
                        <p>{properties.name}</p>
                    </div>
                )
            });
        } else {
            this.getSynths();
        }
        return(
            <div className="synth-interface">
                <div className="synth-selector">
                    {!this.state.currentSynth && 
                        <>
                        {synths}
                        <div className="synth-card" onClick={()=>this.createSynth()}>
                            <p>Create New Synth</p>
                        </div>
                        </>
                    }
                    {this.state.currentSynth && <Synthetizers ></Synthetizers>}
                </div>
            </div>
        )
    }
}

export {
    Synthetizers,
    SynthMenu
}