import { bpms } from "./chords";
import { sleep } from "../utilities/utils";
import { ToneTrack, Tracks} from "./Tracks";
import { TrackModel } from "./models";
import { getAsset, readProject, saveRecentAssets } from "../db/LocalStorage";
import React from "react";



function sortByTone(a, b) {
    let numberA = Number(a.tone);
    let numberB = Number(b.tone);
    if (numberB < numberA) {
        return -1
    } else {
        return 1;
    }
}


class Oscilloscope extends React.Component {
    constructor(props) {
        super(props);
        this.canvas = React.createRef();
        this.player = props.player;
        this.player.oscilloscope = this;
        this.state = {};
    }

    initialize() {
        // Initialize Canvas
        let canvas = this.canvas.current;
        this.oscilloscopeContext = canvas.getContext('2d');
    
        canvas.width = 204;
        canvas.height = 86;
        this.oscilloscopeContext.beginPath();
    }

    async draw(analyzer) {
        let canvas = this.canvas.current;
        analyzer.getByteFrequencyData(this.player.oscillatorDataArray);
        // analyzer.getByteTimeDomainData(this.player.oscillatorDataArray);
        let segmentWidth = canvas.width / analyzer.frequencyBinCount;

        this.oscilloscopeContext.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < analyzer.frequencyBinCount; i += 1) {
            let frequencyHeight = this.player.oscillatorDataArray[i] * canvas.height * 0.006;
            let hsl = `hsl(${i * 360 / analyzer.frequencyBinCount} 50% 50%)`;
            let x = i * canvas.width / analyzer.frequencyBinCount;
            this.oscilloscopeContext.fillStyle = hsl;
            this.oscilloscopeContext.fillRect(
                x,
                canvas.height - frequencyHeight,
                1,
                frequencyHeight
            )
        }

        await sleep(1000/30);
        if (!this.player.stopSignal) {
            this.draw(analyzer);
        }
    }

    render() {
        return(
            <div className="oscilloscope">
                <canvas ref={this.canvas} width={300} height={90}></canvas>
            </div>
        );
    }
}


class AudioTrack extends React.Component {
    constructor(props) {
        super(props);
        this.parent = props.parent;
        this.canvas = React.createRef();
        this.canvasIndicator = React.createRef();
        this.audio = React.createRef();
        this.settings = props.settings;
        this.state = {
            file: null,
            loadFile: false,
            duration: null,
            secondWidth: 30,
            height: 40
        }

    }

    componentDidMount() {
        if (this.settings.id) {
            this.loadFromLocal();
        }
    }

    saveFileToLocal(file) {
        const reader = new FileReader();

        reader.addEventListener('load', () => {
            saveRecentAssets({
                id: crypto.randomUUID(),
                name: file.name
            }, reader.result);
        });

        if (file) {
            reader.readAsDataURL(file);
        }

    }

    async loadFromLocal() {
        let assetId = this.settings.id;
        let [assetInfo, blob] = getAsset(assetId);

        let req = await fetch(blob);
        let blobF = await req.blob();

        let file = new File([blobF], assetInfo.name, {type: blobF.type});

        let buffer = await this.readAudio(URL.createObjectURL(file));
        let leftChannel = buffer.getChannelData(0);
        let duration = leftChannel.length / 44100;
        let secondWidth = this.state.secondWidth;
        if (this.settings.width) {
            secondWidth = this.settings.width / duration;
        }
        this.setState(()=>({file: file, loadFile: true, duration: duration, secondWidth: secondWidth}));
        await sleep(100);
        this.drawCanvas(buffer);
    }

    async loadFile(file) {
        this.saveFileToLocal(file);
        let buffer = await this.readAudio(URL.createObjectURL(file));
        let leftChannel = buffer.getChannelData(0);
        let duration = leftChannel.length / 44100;
        let secondWidth = this.state.secondWidth;
        if (this.settings.width) {
            secondWidth = this.settings.width / duration;
        }
        this.setState(()=>({file: file, loadFile: true, duration: duration, secondWidth: secondWidth}));
        await sleep(100);
        this.drawCanvas(buffer);
    }

    async readAudio(url) {
        let context = new AudioContext();
        console.log('fetch', url);
        const req = await fetch(url);
        const audiobuffer = await req.arrayBuffer();
        let buffer = await context.decodeAudioData(audiobuffer);
        return buffer;
    }

    async renderSpectrogram(e) {
        e.target.innerHTML = 'loading...';
        e.target.style.borderColor = 'yellow';
        e.target.style.color = 'yellow';
        let context = new AudioContext(); // new OfflineAudioContext(2, 44100 * this.state.duration, 44100);
        let buffer = await this.readAudio(URL.createObjectURL(this.state.file));
        
        var javascriptNode = context.createScriptProcessor(256, 1, 1);
        javascriptNode.connect(context.destination);

        const source = context.createBufferSource();
        let analyser = context.createAnalyser();

        analyser.smoothingTimeConstant = 0;
        analyser.fftSize = 4096;
        analyser.connect(javascriptNode);

        source.connect(analyser);
        source.connect(context.destination);

        source.buffer = buffer;

        let finished = false;

        source.onended = async () => {
            console.log();
            finished = true;
            await sleep(500);
            this.drawSpectrum(spectrogramData);
        }

        let spectrogramData = [];

        javascriptNode.onaudioprocess = function () {
            if (finished) {
                javascriptNode.onaudioprocess = null;
                return;
            }
            var array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            // spectrogramData.push(array.slice(0, Math.round(array.length / 2)));
            spectrogramData.push(array);
        };
        source.start(0);
    }

    drawSpectrum(data) {
        this.parent.parent.renderSpectrogram(data);
    }


    drawCanvas(buffer) {

        let leftChannel = buffer.getChannelData(0);
        let duration = this.state.duration;
        let secondWidth = this.state.secondWidth;
        
        // Waveform canvas
        let canvas = this.canvas.current;
        canvas.style.width = Math.round(secondWidth * duration) + 'px';
        canvas.style.height = this.state.height + 'px';


        let canvasRect = canvas.getBoundingClientRect();

        let canvasWidth = canvasRect.width;
        let canvasHeight = this.state.height;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Indicator canvas

        let canvasInd = this.canvasIndicator.current;
        canvasInd.style.width = Math.round(this.state.secondWidth * this.state.duration) + 'px';
        canvasInd.style.height = this.state.height + 'px';

        
        let context = canvas.getContext('2d');
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.strokeStyle = '#51f542';
        context.translate(0, canvasHeight/2);
        let stepSize = Math.round(leftChannel.length / canvasWidth);
        for (let i=0; i < leftChannel.length; i+=stepSize) {
            let x = Math.floor(canvasWidth * i / leftChannel.length);
            let y = (leftChannel[i] * canvasHeight / 2);
            context.beginPath();
            context.moveTo(x, y*-1);
            context.lineTo(x, y);
            
            context.stroke();
        }
        context.restore();
    }

    async play() {
        let context = new AudioContext();
        let buffer = await this.readAudio(URL.createObjectURL(this.state.file));
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start();
        this.startIndicator();
    }

    async startIndicator() {
        let canvas = this.canvasIndicator.current;
        let cw = Math.round(this.state.secondWidth * this.state.duration);
        canvas.style.width = cw + 'px';
        canvas.style.height = this.state.height + 'px';

        let canvasRect = canvas.getBoundingClientRect();

        let canvasWidth = canvasRect.width;
        let canvasHeight = this.state.height;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        let context = canvas.getContext('2d');

        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.strokeStyle = '#42f5ec';

        let tic = ((this.state.duration * 1000) / canvasWidth) * 0.92;
        console.log(cw, tic, this.state.duration);

        for (let i=1; i < canvasWidth; i++) {
            context.beginPath();
            context.moveTo(i, 0);
            context.lineTo(i, canvasHeight);
            context.stroke();
            await sleep(tic);
        }
        context.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    

    render() {
        if (this.state.loadFile) {
            return (
                <div className="audio-track-container">
                    <canvas className="audio-track-waveform" ref={this.canvas}></canvas>
                    <canvas className="audio-track-indicator" ref={this.canvasIndicator}></canvas>
                    <button className="icon icon-play-audio-track" onClick={()=>this.play()}></button>
                    <button className="track-options-button" onClick={(e)=>this.renderSpectrogram(e)}>spectrum</button>
                </div>);
        } else {
            return (
                <div className="audio-track-container">
                    <button className="openfile-button" onClick={async ()=>{
                        let [filehandler] = await window.showOpenFilePicker();
                        let filedata = await filehandler.getFile();
                        this.loadFile(filedata);
                    }}>Load Audio File</button>
                </div>
            )
        }
        
    }
}


class SynthPlayer {
    constructor(synth, props) {
        this.context = new AudioContext({
            sampleRate: 44100
        });
        this.synth = synth;
        this.settings = props.settings;
        this.bpm = this.settings.bpm || 240;

        this.stopSignal = false;
        this.volumeControl = this.context.createGain();
        this.volumeControl.gain.value = this.settings.volume;
        this.currentSecond = 1;
        this.oscillators = {}
    }

    setSettings(settings) {
        this.settings = settings;
        this.bpm = settings.bpm;
    }

    playKey(keyConfig) {
        let oscillator = this.context.createOscillator();
        oscillator.frequency.setValueAtTime(parseFloat(keyConfig.frequency), 0);
        oscillator.type = 'sine';
        oscillator.connect(this.volumeControl);
        this.volumeControl.connect(this.context.destination);
        oscillator.start()
        this.oscillators[keyConfig.id] = oscillator;
    }

    stopKey(oscillatorId) {
        this.oscillators[oscillatorId].stop();
        this.oscillators[oscillatorId].disconnect();
    }

    async scheduleStop(duration, id) {
        await sleep(Math.round(duration));
        this.stopKey(id);
    }

    async playLoop(tracks) {
        let bitDuration = 60000 / this.bpm;
        this.active = true;

        let maxDuration = 0;
        tracks.forEach((track)=>{
            if (Math.max(...track.seconds) > maxDuration) {
                maxDuration = Math.max(...track.seconds);
            }
        });

        while (this.active) {
            for (let bit=1; bit <= maxDuration; bit++) {
                if (!this.active) {
                    break;
                }
                tracks.forEach(track => {
                    if (track.seconds.includes(bit)) {
                        let bitID = crypto.randomUUID();
                        this.playKey(
                            {
                                frequency: track.tone,
                                id: bitID
                            }
                        )
                        this.scheduleStop(bitDuration, bitID);
                    }
                });
                await sleep(bitDuration);
            }
        }
    }

    stopLoop() {
        this.active = false;
    }

    
}



class Player {
    constructor(component, props) {
        this.context = new AudioContext({
            sampleRate: 44100
        });
        this.component = component;
        this.settings = props.settings;
        this.tracks = JSON.parse(JSON.stringify(props.tracks)).map((track, index) => {
            return new ToneTrack(
                index, this.settings.id,
                this.context, track)
        });
        this.tracksController = null;
        this.status = 0;

        this.o = null;
        this.stopSignal = false;
        this.volumeControl = this.context.createGain();
        this.volumeControl.gain.value = this.settings.volume;
        this.currentSecond = 1;
    }

    getSettings() {
        let settingsId = this.settings.id;
        let settings = readProject(this.settings.id).settings;
        settings['id'] = settingsId;
        this.settings = settings;
    }

    async removeTracks() {
        console.log('removing old tracks');
        for (let track of this.tracks) {
            try {
                await track.stop();
            } catch (err) {
                console.log(err);
            }
        }
    }

    updateSecond(second) {
        this.component.updatePlayback(second);
        this.currentSecond = second;
    }

    async play(record=false, initSecond=1, duration=null) {
        let recorder;
        this.status = 1;
        // Record feature
        let recorderDestination;
        if (record) {
            recorderDestination = this.context.createMediaStreamDestination();
            recorder = new MediaRecorder(recorderDestination.stream, {
                mimeType: 'audio/webm;codecs=opus',
                bitsPerSecond: 44100
            });
            let chunks = [];

            recorder.ondataavailable = (evt) => {
                // Push each chunk (blobs) in an array
                chunks.push(evt.data);
            };

            recorder.onstop = (evt) => {
                // Make blob out of our blobs, and open it.
                const blob = new Blob(chunks, { type: "audio/webm;codecs=opus" });
                let data = URL.createObjectURL(blob);

                let link = document.createElement('a');
                link.href = data;
                link.download = 'audio.webm';
                link.click();
            };
        }

        // Web Audio Nodes
        let mainVolume = this.context.createGain();
        mainVolume.gain.value = this.settings.volume;

        // analyzer Node
        this.analyzer = this.context.createAnalyser();

        this.oscillatorDataArray = new Uint8Array(this.analyzer.frequencyBinCount);

        for (let track of this.tracks) {
            track.setDestination(mainVolume);
        }
        mainVolume.connect(this.context.destination);
        mainVolume.connect(this.analyzer);

        this.tracksController = new Tracks(this.tracks);

        if (record) {
            mainVolume.connect(recorderDestination);
            recorder.start();
        }

        let speed = (60000 / (this.settings.bpms));

        let loopCount = 0;

        // start oscilloscope
        this.oscilloscope.initialize();
        this.oscilloscope.draw(this.analyzer);
        while (!this.stopSignal) {
            let loopDuration = !loopCount && duration ? initSecond - 1 + duration : this.settings.duration;

            for (let sec = !loopCount ? initSecond : 1; sec <= loopDuration; sec++) {
                // Refresh Settings
                this.getSettings();
                mainVolume.gain.value = Number(this.settings.volume);
                speed = (60000 / (this.settings.bpms));

                if (this.stopSignal) {
                    console.log('Stop signal called');
                    if (record) {
                        recorder.stop();
                    }
                    await this.stop();

                    this.stopSignal = false;
                    return;
                }

                this.tracksController.tic(sec, speed);
                // if (!record) {
                this.updateSecond(sec);
                // }
                await sleep(speed);
            }
            loopCount = loopCount + 1;
            if (!this.settings.loop || initSecond && duration) {
                break;
            }
        }
        if (record) {
            recorder.stop();
        }

        this.updateSecond(null);

        await this.stop();

    }

    async stop() {
        try {
            this.stopSignal = true;
            // await sleep(100);
            // await this.tracksController.stop();
        } catch(e) {
            console.log(e);
        }
        
    }
}


export {
    Player,
    sortByTone,
    Oscilloscope,
    SynthPlayer,
    AudioTrack
}