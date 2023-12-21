import React from "react";
import { ProjectEditor } from "./Editor/ProjectEditor";
import { ComponentController } from "../configuration/Settings";
import { saveProject, readProject, updateProjectSettings } from "../../db/LocalStorage";
import './Main.css';
import { SynthMenu, Synthetizers } from "./Synths/Synths";


class ProjectCard extends React.Component {
    constructor(props) {
        super(props);
        this.parent = props.parent;
        this.state = props.settings;
    }
    render() {
        return (
            <div className="project-card"
                onClick={()=>this.parent.openProject(this.state.id)}>
                <div className="card-play-control">
                    <button className="icon play-card-icon"></button>
                    <h1>{this.state.project_name}</h1>
                </div>
                <div>
                    <p>Tracks: {this.state.tracks}</p>
                    <p>Last Update: {this.state.last_update}</p>
                    <p>Duration: {this.state.settings.duration}</p>
                    <p>Bpm's: {this.state.settings.bpms}</p>

                </div>
            </div>
        )
    }
}

let basicProject = ()=> {
    return {
        id: crypto.randomUUID(),
        tracks: 9,
        project_name: 'New Project',
        settings: {
            bpms: 140,
            duration: 0,
            volume: 1,
            wave: 'sine',
            loop: false
        },
        last_update: '10/11/23',
        
    }
}

class Main extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projects: null,
            activeProject: null,
            openComponents: false,
            renderSynth: false
        }
    }

    readProjectsIds() {
        let projects = localStorage.getItem('projects');
        if (!projects) {
            return [];
        }
        projects = JSON.parse(projects);
        return projects;
    }

    saveProjectsIds(projects) {
        localStorage.setItem('projects', JSON.stringify(projects));
    }

    saveProject(id, data) {
        localStorage.setItem(id, JSON.stringify(data))
    }

    readProject(id) {
        return JSON.parse(localStorage.getItem(id));
    }

    updateProjectName(event) {
        let name = event.target.value;
        console.log(event);
        let project = this.readProject(this.state.activeProject.id);
        project.project_name = name;
        this.saveProject(project.id, project);
        this.setState(()=>({activeProject: project}));
    }

    createNewProject() {
        let projectSettings = basicProject();
        this.saveProject(projectSettings.id, projectSettings);
        let projectIds = this.readProjectsIds();
        projectIds.push(projectSettings.id);
        this.saveProjectsIds(projectIds);
        this.openProject(projectSettings.id);
    }

    openProject(id) {
        let project = readProject(id);
        this.setState(()=>({activeProject: project}));
    }

    reload(e) {
        console.log('Reload');
        console.log(e);
        if (e.key == 'Enter') {
            this.setState((p)=>(
                {
                    activeProject: readProject(p.activeProject.id),
                    updateName: false
                }
                ))
        }
    }

    renderSynths() {
        this.setState(()=>({renderSynth: true}))
    }



    render() {
        let component = this;
        let projectsView;
        let synths;

        if (this.state.synthsView){
            synths = (
                <div className="synths-list">
                    <button onClick={()=>this.renderSynths()}>Add Synth</button>    
                </div>
            )
        }

        if (!this.state.projects) {
            projectsView = this.readProjectsIds().map((project) =>{
                let projectData = readProject(project);
                return (
                    <ProjectCard key={crypto.randomUUID()} 
                        parent={this}
                        settings={projectData}
                    ></ProjectCard>
                )
            })
        }

        let addProjectBtn =  (
            <div className="project-card add-project"
                onClick={()=>this.createNewProject()}>
                <button className="icon icon-add-project"></button>
                <div>
                    <p>Create new project</p>
                </div>
            </div>
        );
        let content;
        let navContent;

        if (this.state.activeProject) {
            content = (<ProjectEditor key={crypto.randomUUID()} settings={this.state.activeProject}></ProjectEditor>);
            navContent = (
                <div className="nav-content">
                    <button className="icon icon-back" onClick={()=>window.location.reload()}></button>
                    {
                        !this.state.updateName && 
                        <p onClick={()=>this.setState(()=>({updateName: true}))}>{this.state.activeProject.project_name}</p>
                    } {
                        this.state.updateName &&
                        <input placeholder={this.state.activeProject.project_name} value={this.state.activeProject.project_name}
                            onChange={(e)=>this.updateProjectName(e)}
                            onKeyDown={(e)=> this.reload(e)}></input>
                    }
                    
                    <button className="icon icon-refresh"></button>

                    <p onClick={()=>this.setState((p)=>({openComponents: !p.openComponents}))}>Components</p>
                </div>
            )
        } else if (this.state.renderSynth) {
            navContent = (
                <div className="nav-content">
                    <button className="icon icon-back" onClick={()=>window.location.reload()}></button>
                </div>
            )
            content = (
                <SynthMenu></SynthMenu>
            )
        } else {
            navContent = (
                <div className="nav-content">
                    <p onClick={()=>this.renderSynths()}>Synthetizers</p>
                    <p onClick={()=>localStorage.clear()}>Clear All</p>
                </div>
            )
            content = (
                <>
                    <h1>Projects</h1>
                    <div className="projects-container">
                        { projectsView }
                        { addProjectBtn }
                    </div>
                </>
            )
        }

        return (
          <div className="main-container">
            <div className="nav-bar">
                <h1>AudioApp</h1>
                {navContent}
            </div>
            <div className="content-container">
                {synths}
                {this.state.openComponents && <ComponentController></ComponentController>}
                {content}
            </div>
          </div>
        );
    }
}


export {
    Main
}; 