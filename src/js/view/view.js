/**
 * Created by hoho on 2018. 7. 20..
 */
import OvenTemplate from 'view/engine/OvenTemplate';
import Helpers from 'view/components/helpers/main';
import Controls from 'view/components/controls/main';
import PanelManager from "view/global/PanelManager";
import ContextPanel from 'view/components/helpers/contextPanel';
import LA$ from 'utils/likeA$';
import {
    READY,
    DESTROY,
    PLAYER_RESIZED,
    STATE_IDLE,
    STATE_PLAYING,
    STATE_STALLED,
    STATE_LOADING,
    STATE_COMPLETE,
    STATE_PAUSED,
    STATE_ERROR,
    CONTENT_META,
    PLAYER_STATE,
    ERROR
} from "api/constants";
import ResizeSensor from "resize-sensor";

require('../../stylesheet/ovenplayer.less');

const View = function($container){
    let viewTemplate = "", controls = "", helper = "", $playerRoot, contextPanel = "", api = "", autoHideTimer = "", playerState = STATE_IDLE;
    let isShiftPressed = false;
    let panelManager = PanelManager();

    let currentPlayerSize = "";

    let setHide = function (hide, autoHide) {

        if (autoHideTimer) {
            clearTimeout(autoHideTimer);
            autoHideTimer = null;
        }

        if (hide) {
            if(panelManager.size() > 0){
                return false;
            }
            $playerRoot.addClass("ovp-autohide");
        } else {
            $playerRoot.removeClass("ovp-autohide");

            if (autoHide) {
                autoHideTimer = setTimeout(function() {
                    if(panelManager.size()> 0){
                        return false;
                    }
                    $playerRoot.addClass("ovp-autohide");
                }, 3000);
            }
        }
    };
    let togglePlayPause = function () {
        const currentState = playerState;

        if (currentState === STATE_IDLE || currentState === STATE_PAUSED || currentState === STATE_COMPLETE) {
            api.play();
        }else if(currentState === STATE_PLAYING){
            api.pause();
        }
    };
    let seek = function (seconds, isRewind) {

        const duration = api.getDuration();
        const currentPosition = api.getPosition();
        let position = 0;

        if(isRewind){
            position = Math.max(currentPosition - seconds, 0);
        }else{
            position = Math.min(currentPosition + seconds, duration);
        }

        api.seek(position);
    };
    let volume = function(isUp){
        const currentVolumn = api.getVolume();
        let newVolume = 0;
        if(isUp){
            newVolume =  Math.min(currentVolumn + 5, 100);
        }else{
            newVolume = Math.max(currentVolumn - 5, 0);
        }
        api.setVolume(newVolume);
    };
    let createContextPanel = function(pageX, pageY){
        if(contextPanel){
            contextPanel.destroy();
            contextPanel = null;
        }
        contextPanel = ContextPanel($playerRoot, api, {pageX : pageX, pageY : pageY});
    };




    const onRendered = function($current, template){
        $playerRoot = $current;
        viewTemplate = template;

        new ResizeSensor($playerRoot.get(), function() {
            let newSize = "";
            $playerRoot.removeClass("large");
            $playerRoot.removeClass("medium");
            $playerRoot.removeClass("small");
            $playerRoot.removeClass("xsmall");
            let playerWidth = $playerRoot.width();
            if(playerWidth < 576){
                newSize = "xsmall";
                $playerRoot.addClass("xsmall");
            }else if(playerWidth < 768){
                newSize = "small";
                $playerRoot.addClass("small");
            }else if(playerWidth < 992){
                newSize = "medium";
                $playerRoot.addClass("medium");
            }else{
                newSize = "large";
                $playerRoot.addClass("large");
            }
            if(newSize != currentPlayerSize){
                currentPlayerSize = newSize;
                api.trigger(PLAYER_RESIZED, currentPlayerSize);
            }
        });

    };
    const onDestroyed = function(){
        if(helper){
            helper.destroy();
            helper = null;
        }
        if(controls){
            controls.destroy();
            controls = null;
        }
    };
    const events = {
        "click .ovenplayer" : function(event, $current, template){
            event.preventDefault();
            if(contextPanel){
                contextPanel.destroy();
                contextPanel = null;
                return false;
            }

            if(!(LA$(event.target).closest(".ovp-controls-container") || LA$(event.target).closest(".ovp-setting-panel") )){
                if(panelManager.size() > 0){
                    panelManager.clear();
                    return false;
                }
                //togglePlayPause();
            }
        },
        "mouseenter .ovenplayer" : function(event, $current, template){
            event.preventDefault();
            if (playerState === STATE_PLAYING) {
                setHide(false, true);
            } else {
                setHide(false);
            }
        },
        "mousemove .ovenplayer" : function(event, $current, template){
            event.preventDefault();

            if (playerState === STATE_PLAYING) {
                setHide(false, true);
            } else {
                setHide(false);
            }
        },
        "mouseleave .ovenplayer" : function(event, $current, template){
            event.preventDefault();

            if(playerState === STATE_PLAYING){
                setHide(true);
            }
        },
        "keydown .ovenplayer" : function(event, $current, template){
            let frameMode = api.getFramerate();
            switch(event.keyCode){
                case 16 :   //shift
                    event.preventDefault();
                    isShiftPressed = true;
                    break;
                case 32 :   //sapce
                    event.preventDefault();
                    togglePlayPause();
                    break;
                case 37 : //arrow left
                    event.preventDefault();
                    if(isShiftPressed && frameMode){
                        api.seekFrame(-1);
                    }else{
                        seek(5, true);
                    }
                    break;
                case 39 : //arrow right
                    event.preventDefault();
                    if(isShiftPressed && frameMode){
                        api.seekFrame(1);
                    }else{
                        seek(5, false);
                    }
                    break;
                case 38 : //arrow up
                    event.preventDefault();
                    volume(true);
                    break;
                case 40 : //arrow up
                    event.preventDefault();
                    volume(false);
                    break;
            }

        },
        "keyup .ovenplayer" : function(event, $current, template){
            switch(event.keyCode) {
                case 16 :   //shift
                    event.preventDefault();
                    isShiftPressed = false;
                    break;
            }

        },
        "contextmenu .ovenplayer" : function(event, $current, template){
            event.stopPropagation();
            if(!LA$(event.currentTarget).find("object")){
                event.preventDefault();
                createContextPanel(event.pageX, event.pageY);
                return false;
            }
        }
    };


    return Object.assign(OvenTemplate($container, "View", $container.id, events, onRendered, onDestroyed, true), {
        getMediaElementContainer: function () {
            return $playerRoot.find(".ovp-media-element-container").get();
        },
        setApi: function (playerInstance) {
            api = playerInstance;
            let showControlBar = api.getConfig() && api.getConfig().controls;

            helper = Helpers($playerRoot.find(".ovp-ui"), playerInstance);
            if(showControlBar){
                controls = Controls($playerRoot.find(".ovp-ui"), playerInstance);
            }

            api.on(READY, function(data) {
                if(!controls && showControlBar){
                    controls = Controls($playerRoot.find(".ovp-ui"), playerInstance);
                }
            });

            api.on(ERROR, function(error) {
                if(api){
                    let sources = api.getSources()||[];
                    if(controls && (sources.length <= 1)){
                        controls.destroy();
                        controls = null;
                    }
                }

            });

            api.on(DESTROY, function(data) {
                viewTemplate.destroy();
            });

            api.on(PLAYER_STATE, function(data){
                if(data && data.newstate){
                    playerState = data.newstate;
                    if(data.newstate === STATE_PLAYING){
                        setHide(false, true);
                    }else{
                        setHide(false);
                    }
                }
            });
        }
    });
};



export default View;
