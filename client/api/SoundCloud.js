var Enum = require("../modules/Enum.js");

var SoundCloud = {};

SoundCloud.init = function()
{
	SC.initialize
	({
		client_id: "2f8f0d3feaba4ed1c596902b225aad55"
	});
}

// Called upon a player state change
SoundCloud.onPlayerStateChange = function(state)
{
	var Player = require("../modules/Player.js");

	var playing = (state == "playing" || state == "loading" || state == "seeking");

	Player.playing = playing;

	$("#pause").toggle(playing);
	$("#play").toggle(!playing);

	if(playing)
		return;

	$("#seekbar-fill").finish();

	if(state != "ended")
		return;

	Player.switchItem(Enum.Direction.Next);
}

// Called when the cursor entered the cover image area
SoundCloud.onCoverHoverIn = function()
{
	$("#creator").stop(true).fadeIn(500);
}

// Called when the cursor left the cover image area
SoundCloud.onCoverHoverOut = function()
{
	$("#creator").stop(true).delay(5000).fadeOut(2000);
}

module.exports = SoundCloud;
