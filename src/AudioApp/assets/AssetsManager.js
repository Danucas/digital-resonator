import React from "react";
import { getAsset, getRecentAssets } from "../../db/LocalStorage";
import './AssetsManager.css';
import { AudioTrack } from "../../AudioTools/WebAudioApiControllers";

class AssetsManager extends React.Component {
    constructor(props) {
        super(props);
        this.parent = props.parent;
        this.state = {
            position: {
                x: 24,
                y: 24
            }
        }
    }

    moveWindow () {
        document.onmousemove = (event) => {
            event.preventDefault();
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

    render() {
        let assets = getRecentAssets();
        let assetsList;
        if (assets) {
            assetsList = assets.map((assetId)=>{
                let [assetInfo, blob] = getAsset(assetId);
                return (
                    <div className="asset-item-container">
                        <p>{assetInfo.name}</p>
                        <AudioTrack parent={this} settings={{width: 300, ...assetInfo}}></AudioTrack>
                    </div>
                )
            });
        }

        return(
            <div className="assets-manager" style={{top: this.state.position.y, left: this.state.position.x}}>
                <div className="icon icon-grab-window" onMouseDown={()=>this.moveWindow()}></div>
                <h1>Assets</h1>
                <div className="assets-list-container">
                    <div className="asset-item-container">
                        <AudioTrack settings={{width: 300}}></AudioTrack>
                    </div>
                    {assetsList}
                </div>
            </div>
        );
    }
}

export {
    AssetsManager
}