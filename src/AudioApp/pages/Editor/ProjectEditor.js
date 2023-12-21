import React from 'react';
import { sortByTone, AudioTrack } from '../../../AudioTools/WebAudioApiControllers';
import './ProjectEditor.css';
import { chords, bpms, waves } from '../../../AudioTools/chords';
import { Player } from '../../../AudioTools/WebAudioApiControllers';
import { TrackModel } from '../../../AudioTools/models';
import { sleep } from '../../../utilities/utils';
import { TrackSettings, TrackSettingsEditor, ComponentController } from '../../configuration/Settings';
import {
  updateProjectSettings,
  saveProject,
  readProject,
  saveProjectTracks,
  readProjectTracks,
  getRecentAssets,
  getAsset,
} from '../../../db/LocalStorage';
import { Knob } from '../../configuration/components/Knob';
import { WaveFormSelector } from '../../configuration/components/WaveForm';
import { Oscilloscope } from '../../../AudioTools/WebAudioApiControllers';
import { AssetsManager } from '../../assets/AssetsManager';


function calcVal(val) {
  return Math.round((val) * 50 / 255);
}

class Spectrogram extends React.Component {
  constructor(props) {
    super(props);
    this.data = props.data;
    this.parent = props.parent;
    this.canvas = React.createRef();
    this.threshold = 30;
    this.state = {
      position: {
        x: 24, y: 100
      },
      drawn: false
    }
  }

  async drawSpectrum() {
    await sleep(2000);
    this.setState(()=>({drawn: true}));
    let data = this.data;

    let canvas = this.canvas.current;

    let canvasWidth; 
    // canvasWidth = data.length
    canvasWidth = Math.round(window.innerWidth * 0.8);
    let canvasHeight; 
    canvasHeight = data[0].length
    // canvasHeight = Math.round(window.innerHeight * 0.6);

    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    let context = canvas.getContext('2d');

    canvas.addEventListener('click', (e)=> {
      let rect = canvas.getBoundingClientRect();
      
      let index =  e.clientX - rect.left;

      console.log(index);
      let freqs = this.filterFrequencies(data[index]);
      console.log(freqs);

      let conf = [];
      for (let f of freqs) {
        let val = (data[index][f]) * 1 / 255;
        conf.push([f, val]);
      }

      this.parent.createFrequencies(conf);
    });

    for (let x=0; x < canvasWidth; x++) {
      let xi = Math.round(x * data.length / canvasWidth);
      if (xi >= data.length) {
        break;
      }
      let yValues = data[xi]      

      for (let y=0; y < canvasHeight; y++) {
        let yi = Math.round(y * yValues.length / canvasHeight);
      
        if (yi >= yValues.length) {
          break;
        }
        let val = calcVal(yValues[yi]);

        // if (val < this.threshold) {
        //   val = 0;
        // }       

        let color = `hsl(${360 - (y * 360 / canvasHeight)}, 100%, ${val}%)`;

        context.fillStyle = color;
        context.fillRect(x, canvasHeight - y, 1, 1);
      }
    }
  }

  filterFrequencies(values) {
    let compY = [];
    let index = 0;
    for (let yv of values) {
        let val = calcVal(yv);
        if (val > this.threshold) {
          compY.push(index);
        }
        index++;
    };
    compY.sort((a, b)=>a - b);

    compY = this.sortNearest(compY);
  
    return compY;
  }


  sortNearest(values) {
    let newValues = [];
    for (let i = 0; i < values.length; i++) {
      let val = values[i];
      let count = 0;
      let stop = false;
      let sumv = val;
      while (!stop) {
        let ind = i + count;
        if (ind >= values.length) {
          break;
        }
        let v = values[ind];
        if (v > val + 5) {
          break;
        } else {
          sumv = sumv + v;
        }
        count++;
      }

      i = i + count;

      val = Math.round(sumv / (count + 1));
      newValues.push(val);

    }
    return newValues;
  }

  moveWindow() {
    document.onmousemove = (event) => {
      event.preventDefault();
      let y = event.movementY;
      let x = event.movementX;


      this.setState((p) => {
        if (p.y + y < 0) {
          p.y = 24;
        }
        return (
          { position: { x: p.position.x + x, y: p.position.y + y } }
        )
      });
    }
    document.onmouseup = (event) => {
      document.onmousemove = null;
    }

  }


  render() {
    if (!this.state.drawn) {
      this.drawSpectrum();
    }
    return (
      <div className='spectrogram-container' style={{ top: this.state.position.y, left: this.state.position.x }}>
        <div className="icon icon-grab-window" onMouseDown={() => this.moveWindow()}></div>
        <canvas ref={this.canvas}></canvas>
      </div>
    );
  }
}


class ProjectEditor extends React.Component {
  constructor(props) {
    super(props);
    this.scrollRef = React.createRef();
    this.oscilloscopeHtml = React.createRef();
    this.state = {
      project: props.settings,
      tones: null,
      player: null,
      currentSecond: null,
      editorSeconds: props.settings.duration || 25,
      alert: null,
      alertComponent: null,
      status: null,
      playback: false,
      oscilloscope: null,
      components: []
    }
  }

  addComponent(Component, settings) {
    this.setState((p) => {
      p.components.push({ component: Component, settings: settings });
      return ({
        components: p.components
      })
    })
  }


  saveSettings(key, data) {
    updateProjectSettings(this.state.project.id, key, data);
    this.setState((p) => ({ alert: null, alertComponent: null, project: readProject(p.project.id) }))
  }

  closeAlert() {
    this.setState((p) => ({ tones: readProjectTracks(p.project.id), alert: null, alertComponent: null }))
  }

  async scrollToSecond() {
    await sleep(10);
    try {
      this.scrollRef.current.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'center'
      });
    } catch (er) {

    }

  }

  autosave() {
    if (!this.state.tones) {
      return;
    } else {
      this.saveProjectStatus(this.state.tones);
    }
  }

  clearEditor() {
    window.location.reload();
  }

  saveProjectStatus(tones) {
    if (!this.state.project) {
      return;
    }
    let project = readProject(this.state.project.id);
    let localProject = this.state.project;
    // settings
    project.settings.duration = this.getMaxSecond(tones, 0);
    project.settings.bpms = localProject.settings.bpms;
    project.settings.waves = localProject.settings.waves;
    project.settings.volume = localProject.settings.volume;
    project.settings.loop = localProject.settings.loop;

    // project identifiers
    project.tracks = tones.length;

    saveProject(project.id, project);
    saveProjectTracks(project.id, tones)
    return project;
  }

  autoread() {
    let tones;
    try {
      tones = readProjectTracks(this.state.project.id);
    } catch (e) {
      return
    }
    if (tones && !this.state.tones) {
      let maxSeconds = this.getMaxSecond(tones, 0)
      this.setState((p) => ({ tones: tones, project: readProject(p.project.id), editorSeconds: maxSeconds }));
    }
    // this.setState((p) => ({ project: readProject(p.project.id) }));

  }

  cleanAll() {
    let tones = this.state.tones;
    for (let tone of tones) {
      tone.seconds = [];
    }
    this.setState(() => ({ tones: tones }));
  }


  updatePlayback(second) {
    let newState = {}
    newState.currentSecond = second;
    if (!second) {
      newState.player = null;
      newState.status = null;
      newState.playback = false;
    }
    this.setState(() => (newState));
  }

  createFrequencies(frequencies) {
    let tones = [];

    for (let [tone, gain] of frequencies) {
      let track = TrackModel();
      let t = tone;
      track.tone = t;
      track.settings.waves[0].frequency = t;
      track.settings.gain = gain;
      track.seconds = [0, 1];
      track.label = `${t}`;
      tones.push(track);
    }
    saveProjectTracks(this.state.project.id, tones);
    this.setState((p) => ({ tones: tones }));
  }

  createNewTrack() {
    let tones;
    if (!this.state.tones) {
      tones = [];
    } else {
      tones = this.state.tones;
    }
    let newTone = TrackModel();
    tones.push(newTone);
    saveProjectTracks(this.state.project.id, tones);
    this.setState((p) => ({ tones: tones }));
  }

  sortTones() {
    let tones = this.state.tones;
    tones = Object.assign([], tones).sort(sortByTone);
    this.setState(() => ({ tones: tones }))
  }

  updateTone(index, event) {
    let tones = this.state.tones;
    tones[index].tone = event.target.value;
    this.setState(() => ({ tones: tones }))
  }

  removeTone(index) {
    let tones = this.state.tones;
    tones.splice(index, 1);
    this.setState(() => ({ tones: tones }));
  }


  getMaxSecond(tones, maxSecond) {
    let second = maxSecond;
    for (let tone of tones) {
      for (let sec of tone.seconds) {
        second = sec > second ? sec : second;
      }
    }
    return second;
  }

  addSecond(index, second) {
    let tones = this.state.tones;
    let maxSecond = this.state.project.settings.duration;

    if (tones[index].seconds.includes(second)) {
      let remIndex = tones[index].seconds.indexOf(second);
      tones[index].seconds.splice(remIndex, 1);
      maxSecond = 0;
    } else {
      tones[index].seconds.push(second);
    }

    maxSecond = this.getMaxSecond(tones, maxSecond);
    updateProjectSettings(this.state.project.id, 'duration', maxSecond);
    saveProjectTracks(this.state.project.id, tones);
    this.setState((p) => ({ tones: tones, project: readProject(p.project.id) }));
  }

  async play(record = false) {
    if (!this.state.tones) {
      return;
    }

    let player;
    let settings = readProject(this.state.project.id).settings;
    settings['id'] = this.state.project.id;
    let trackData = {
      settings: settings,
      tracks: this.state.tones
    }

    player = new Player(this, trackData)
    let oscilloscope = (<Oscilloscope key={crypto.randomUUID()} player={player}></Oscilloscope>);
    ;
    let status = 'Playing';
    if (record) {
      status = 'Recording';
    }
    this.setState(() => ({ player: player, status: status, oscilloscope: oscilloscope }));
  }

  componentDidUpdate() {
    if (this.state.player && !this.state.player.status) {
      if (this.state.playback) {
        this.state.player.play.apply(this.state.player, this.state.playback);
      } else {
        this.state.player.play(false);
      }

    }
  }

  playSecond(second) {
    let player;
    let settings = readProject(this.state.project.id).settings;
    settings['id'] = this.state.project.id;
    let trackData = {
      settings: settings,
      tracks: this.state.tones
    }

    player = new Player(this, trackData);

    let oscilloscope = (<Oscilloscope key={crypto.randomUUID()} player={player}></Oscilloscope>);

    this.setState(() => ({ player: player, playback: [null, second, 1], oscilloscope: oscilloscope }));
  }

  toggleLoop() {
    updateProjectSettings(this.state.project.id, 'loop', !this.state.project.settings.loop);
    this.setState(() => ({ tones: null }));
  }

  async stop() {
    await this.state.player.stop();
    this.setState(() => ({ currentSecond: null, player: null, status: null }))
  }


  addEditorSecond(second) {
    this.setState((p) => ({ editorSeconds: p.editorSeconds + second }))
  }

  startDownload() {
    let component = this;
    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = (event) => {
      component.importJson(event)
    }
    input.click();
  }

  exportJson() {
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state.tones));
    let downloadEl = document.createElement('a');
    downloadEl.setAttribute('href', dataStr);
    downloadEl.setAttribute('download', 'sample.json');
    downloadEl.click();
  }

  importJson(e) {
    let component = this
    let file = e.target.files[0];
    if (!file) {
      return;
    }
    let reader = new FileReader();
    reader.onload = (ev) => {
      let contents = ev.target.result;
      let tones = JSON.parse(contents).sort(sortByTone);
      component.setState(() => ({ tones: tones }));
    }

    reader.readAsText(file);
  }

  renderTools() {
    let statusColorStyle;
    if (!this.state.status) {
      statusColorStyle = { color: 'white' }
    } else if (this.state.status == 'Playing') {
      statusColorStyle = { color: '#64FFAB' }
    } else if (this.state.status == 'Recording') {
      statusColorStyle = { color: '#db688b' }
    }

    let styleByStatus = (status) => {
      if (this.state.status) {
        if (this.state.status == status) {
          return { backgroundColor: 'white' }
        } else {
          return { backgroundColor: 'gray' }
        }
      }
    }

    return (
      <div className='settings-container'>
        <div className='input-controls'>
          <div className='control-box' style={{ padding: 0, height: 'fit-content' }}>
            <Knob
              style={{ margin: 0 }}
              label="Volume"
              min={0}
              max={10}
              step={0.2}
              value={this.state.project.settings.volume}
              update={(value) => {
                this.saveSettings('volume', value);
              }}
            ></Knob>
          </div>
          {/* {Volume, Waveform and Loop settings} */}

          {/* Speed in bpm settings */}
          <div className='control-box' style={{ padding: 0 }}>
            <Knob
              style={{ margin: 0 }}
              label="Bpm"
              min={1}
              max={440}
              step={2}
              value={this.state.project.settings.bpms}
              update={(value) => {
                this.saveSettings('bpms', value);
              }}
            ></Knob>
          </div>

          <div className='control-box'>
            <p>Loop Mode</p>
            <input type='checkbox'
              onChange={() => this.toggleLoop()}
              checked={this.state.project.settings.loop}></input>
          </div>

          {/* Player controls */}
          <div className='control-box player'>
            <button className='icon icon-record' style={styleByStatus('Recording')} onClick={() => this.play(true)}></button>
            <button className='icon icon-stop' style={styleByStatus(null)} onClick={() => this.stop()}></button>
            <button className='icon icon-play' style={styleByStatus('Playing')} onClick={() => this.play()}></button>


          </div>
          <div className='control-box player'>
            <div>
              <p>Status</p>
              <h1 style={statusColorStyle}>{this.state.status || 'Stopped'}</h1>
            </div>
          </div>

          <div className='control-box player' style={{ backgroundColor: 'black', borderColor: 'black', width: 180 }}>
            {this.state.oscilloscope}
          </div>
        </div>
      </div>
    )
  }

  renderTrackHeaders() {
    let seconds = [];
    let comp = this.state.editorSeconds || 25;
    for (let i = 1; i <= (comp); i++) {
      let current = '';
      let ref;

      if (this.state.currentSecond == i) {
        current = 'current';
        ref = this.scrollRef;
      }


      seconds.push(<h1 ref={ref} key={crypto.randomUUID()} className={`time-cell header ${current}`} onClick={() => this.playSecond(i)}>{i}</h1>)
    }
    seconds.push(<h1 key={crypto.randomUUID()} className={`time-cell header add`} onClick={() => this.addEditorSecond(1)}>+</h1>);
    return (
      <div className='tone-input header' style={this.gridConfiguration()}>
        <p>Frequency Hz</p>
        <p></p>
        <p></p>
        {seconds}
      </div>
    );
  }

  gridConfiguration() {
    let comp = this.state.editorSeconds || 25;
    return {
      gridTemplateColumns: `120px 40px 40px repeat(${comp + 1}, 42px)`
    }
  }

  trackSettings(index) {
    let trackerView = (
      <TrackSettings
        key={crypto.randomUUID()}
        input={this}
        index={index}
        settings={this.state.tones[index].settings}
        projectId={this.state.project.id}>
      </TrackSettings>)
    this.setState(() => ({ alert: true, alertComponent: trackerView }));
  }

  renderSpectrogram(data) {
    let view = (
      <Spectrogram parent={this}
        data={data}></Spectrogram>
    )
    this.setState(() => ({ alert: true, alertComponent: view }))
  }


  renderTrackViews() {
    let component = this;
    // Tracker lines render
    if (this.state.tones) {
      let tracks = this.state.tones.map((tone, index) => {
        let gridCells = [];
        // Create Grid Cell views
        let comp = this.state.editorSeconds || 25;
        for (let i = 1; i <= comp; i++) {
          let selected;
          let current;
          if (this.state.currentSecond == i) {
            current = 'current';
          }
          if (tone.seconds.includes(i)) {
            let hsl = {
              backgroundColor: `hsl(${tone.settings.waves[0].frequency * 360 / 3000} 50% 50%)`
            }
            selected = (
              <div
                key={crypto.randomUUID()}
                className={`selected-second ${current}`}
                style={hsl}>
              </div>);
          }

          gridCells.push(
            <div
              key={crypto.randomUUID()}
              className={`time-cell ${current}`}
              onClick={() => component.addSecond(index, i)}>
              {selected}
            </div>);
        }
        return (
          /* Track Frequency Selector */
          <div
            key={crypto.randomUUID()}
            className='tone-input'
            style={component.gridConfiguration()}>

            {/* <select
              key={crypto.randomUUID()}
              value={tone.tone}
              onChange={(e) => component.updateTone(index, e)}>
              {
                Object.entries(chords).map(([chord, frequency]) => {
                  return (
                    <option
                      key={crypto.randomUUID()}
                      value={frequency}>{chord} - {frequency}
                    </option>
                  )
                })
              }
            </select> */}
            <h1>{tone.label} ({tone.settings.waves[0].frequency})</h1>
            {/* Track Settings Button */}
            <button key={crypto.randomUUID()}
              onClick={() => component.trackSettings(index)}
              className='icon icon-track-settings'></button>
            <button
              key={crypto.randomUUID()}
              className="icon icon-trash"
              onClick={() => component.removeTone(index)}
            >
            </button>
            {/* All other Grid cells */}
            {gridCells}
          </div>
        )
      });
      return tracks;
    }
  }

  render() {
    this.autoread();
    this.autosave();

    if (!this.state.playback && this.state.currentSecond) {
      this.scrollToSecond();
    }

    let extraComponents;
    if (this.state.components) {
      extraComponents = this.state.components.map((component) => {
        let Component = component.component;
        return (<Component settings={component.settings}></Component>);
      })
    }

    return (
      <div className='main-container'>
        <AssetsManager parent={this}></AssetsManager>
        {this.state.alert && this.state.alertComponent}
        {this.renderTools()}
        <div className='editor-container'>
          <div className='buttons'>
            <div className="tool-button" onClick={() => this.startDownload()}><p>Upload file</p><button className='icon icon-upload'></button></div>
            <div className="tool-button" onClick={() => this.createNewTrack()}><p>Add Track</p><button className='icon icon-track'></button></div>
            <div className="tool-button" onClick={() => this.cleanAll()}><p>Clear bits</p><button className='icon icon-wipe'></button></div>
            <div className="tool-button" onClick={() => this.sortTones()}><p>Sort Tones</p><button className='icon icon-sort'></button></div>
            <div className="tool-button" onClick={() => this.exportJson()}><p>Download</p><button className='icon icon-export'></button></div>
            <div className="tool-button" onClick={() => this.clearEditor()}><p>Clean all</p><button className='icon icon-restart'></button></div>
            <div className="tool-button" onClick={() => this.addComponent(AudioTrack, {})}><p>Audio</p><button className='icon icon-restart'></button></div>
          </div>
          <div className='tones-container'>
            {this.renderTrackHeaders()}
            {this.renderTrackViews()}
          </div>
        </div>
        {extraComponents}
      </div>
    )
  }
}


export {
  ProjectEditor
};
