var Cookie = require("../modules/Cookie.js");

$.getScript("https://www.youtube.com/iframe_api");

var YouTube =
{
	loaded: false,
	hd: Cookie.get("hd", true)
}

// Called when the player is ready for use
YouTube.onPlayerReady = function()
{
	var Player = require("../modules/Player.js");

	YouTube.loaded = true;
	Player.updateVolume();
	YouTube.updatePlaybackQuality();
}

// Called upon a player state change
YouTube.onPlayerStateChange = function(event)
{
	var Player = require("../modules/Player.js");

	var state = event.data
	var playing = (state == YT.PlayerState.PLAYING || state == YT.PlayerState.BUFFERING);

	Player.playing = playing;

	$("#pause").toggle(playing);
	$("#play").toggle(!playing);

	if(playing)
		return;

	$("#seekbar-fill").finish();

	if(state != YT.PlayerState.ENDED)
		return;

	var ItemList = require("../modules/ItemList.js");
	Player.switchItem(ItemList.NEXT_ITEM);
}

// Called upon video load error
YouTube.onPlayerError = function()
{
	var Player = require("../modules/Player.js");
	Player.onPlaybackError();
}

// Called upon successful load of the external script
window.onYouTubeIframeAPIReady = function()
{
	YouTube.player = new YT.Player("video-iframe",
	{
		width: "480",
		height: "270",
		playerVars:
		{
			"controls": 0, // Player controls do not display in the player
			"iv_load_policy": 3, // Annotations not shown by default
			"rel": 0, // Do not show related videos at the end of playback
			"showinfo": 0 // Hide information about title and uploader
		},
		events:
		{
			"onReady": YouTube.onPlayerReady,
			"onStateChange": YouTube.onPlayerStateChange,
			"onError": YouTube.onPlayerError
		}
	});
}

// Toggle high definition quality
YouTube.togglePlaybackQuality = function()
{
	YouTube.hd = !YouTube.hd;
	Cookie.set("hd", YouTube.hd.toString());
	YouTube.updatePlaybackQuality();
}

// Update playback quality of the player
YouTube.updatePlaybackQuality = function()
{
	YouTube.player.setPlaybackQuality(YouTube.hd ? "hd720" : "large");
	$("#hd").toggleClass("disabled", !YouTube.hd);
}

// Called when the cursor has entered the video area
YouTube.onVideoHoverIn = function()
{
	$("#hd")
		.stop(true)
		.fadeIn(200);
}

// Called when the cursor has left the video area
YouTube.onVideoHoverOut = function()
{
	$("#hd")
		.stop(true)
		.delay(5000)
		.fadeOut(2000);
}

YouTube.init = function()
{
	$("#video").hover(YouTube.onVideoHoverIn, YouTube.onVideoHoverOut);
	$("#hd").click(YouTube.togglePlaybackQuality);
}

module.exports = YouTube;
