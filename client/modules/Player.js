var Enum = require("./Enum.js");
var Cookie = require("./Cookie.js");

var YouTube = require("../api/YouTube.js");
var SoundCloud = require("../api/SoundCloud.js");

var Player =
{
	playing: false, // Player state is set to playing
	volume: Cookie.get("volume", 80), // Playback volume
	lastVolume: 0, // Playback volume before muting
	muted: false, // Sound is muted by the user
	draggingSeekbar: false, // Seekbar is being dragged
	freezeSeekbar: false, // Disable seekbar animation
	draggingVolume: false, // Volume bar is being dragged
	mouseX: 0 // Horizontal position of the mouse cursor
}

// Start track playback
Player.play = function()
{
	if(!$(".item.active").length)
	{
		$(".item:first .artist").click();
		return;
	}
	if(SoundCloud.player)
	{
		SoundCloud.player.play();
	}
	else
	{
		if(!YouTube.loaded)
			return;
		YouTube.player.playVideo();
	}
	$("#play").hide();
	$("#pause").show();
	Player.playing = true;
}

// Pause track playback
Player.pause = function()
{
	if(SoundCloud.player)
	{
		SoundCloud.player.pause();
	}
	else
	{
		if(!YouTube.loaded)
			return;
		YouTube.player.pauseVideo();
	}
	$("#pause").hide();
	$("#play").show();
	$("#seekbar-fill").finish();
	Player.playing = false;
}

// Toggle playback state
Player.toggle = function()
{
	Player.playing ? Player.pause() : Player.play();
}

// Play specified item
Player.setItem = function()
{
	$item = $(this).parent();

	if($item.is(".active"))
		return;

	$("#meta-artist").html($item.find(".artist").html());
	$("#meta-title").html($item.find(".title").html());

	$("#items .item").removeClass("active");

	var ItemList = require("./ItemList.js");
	ItemList.scrollTo($item);

	if(SoundCloud.player)
	{
		SoundCloud.player.pause();
		SoundCloud.player.dispose();
		SoundCloud.player = null;
	}

	$("#seekbar-fill").stop(true, true).width(0);
	$("#current-time, #total-time").text("00:00");

	$("#tab-content").data( "content", [] );
	var ContentTab = require("../tabs/ContentTab.js");
	ContentTab.setSwitchEnabled(true);

	if(!$item.data("sourceId"))
	{
		$item.addClass("active");
		var Content = require("./Content.js");
		return Content.request($item.data("trackId"), true);
	}

	if($item.data("sourceId") == Enum.Source.YouTube)
	{
		if(!YouTube.loaded)
			return;

		$item.addClass("active");

		$("#cover").empty().hide();
		$("#video").show();

		var externalId = $item.data("externalId");
		YouTube.player.loadVideoById(externalId);
		$("#content-image").attr("src", "http://img.youtube.com/vi/" + externalId + "/0.jpg");
		return;
	}
	if($item.data("sourceId") == Enum.Source.SoundCloud)
	{
		$item.addClass("active");

		if(YouTube.loaded)
		{
			YouTube.player.stopVideo();
			YouTube.player.clearVideo();
		}

		$("#video").hide();
		$("#cover").empty();

		var trackString = "/tracks/" + $item.data("externalId");

		SC.get(trackString).then(function(response)
		{
			var imageUrl = response.artwork_url || response.user.avatar_url;
			if(imageUrl)
			{
				$("#cover")
					.append(
						$("<img>")
							.attr("src", imageUrl.replace("large", "t500x500"))
							.addClass("back").click(Player.toggle)
					);
				$("#cover")
					.append(
						$("<img>")
						.attr("src", imageUrl.replace("large", "t300x300"))
						.addClass("front").click(Player.toggle)
					);
				$("#content-image").attr("src", imageUrl.replace("large", "t300x300"));
			}
			else
			{
				$("#content-image").attr("src", "");
			}

			$("#cover")
				.append(
					$("<a>")
						.attr({ "href": response.permalink_url, "target": "_blank" })
						.click(function()
						{
							$("#pause").click();
						})
						.append(
							$("<img>").attr({ "src": "/img/soundcloud.png", "id": "soundcloud" })
						)
				);

			$("#cover")
				.append($("<a>").attr({ "href": response.user.permalink_url, "target": "_blank", "id": "creator" })
				.text(response.user.username).delay(5000).fadeOut(2000))
				.show();

			$("#cover").unbind().hover(function()
			{
				$("#creator").stop(true).fadeIn(500);
			},
			function()
			{
				$("#creator").stop(true).delay(5000).fadeOut(2000);
			});
		});

		SC.stream(trackString).then(function(trackPlayer)
		{
			SoundCloud.player = trackPlayer;
			SoundCloud.player.play();
			SoundCloud.player.setVolume(Player.volume / 100);

			SoundCloud.player.on("state-change", function(state)
			{
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
			});
		});

		return;
	}
}

// Play next/previous item
Player.switchItem = function(forward, manual)
{
	var $item = $(".item.active").closest(".item");
	$item = forward ? $item.next() : $item.prev();

	if($item.length < 1)
	{
		if(!manual)
			return;

		$item = forward ? $(".item:first") : $(".item:last");
	}

	$(":first-child", $item).click();
}

// Enable seekbar animation
Player.unfreezeSeekbar = function()
{
	Player.freezeSeekbar = false;
}

// Update volume of external players and the volume bar elements
Player.updateVolume = function()
{
	if(SoundCloud.player)
	{
		SoundCloud.player.setVolume(Player.volume / 100);
	}
	else if(YouTube.loaded)
	{
		YouTube.player.setVolume(Player.volume);
	}

	$("#volume-fill").width(Player.volume + "%");

	var state = "up";

	if(Player.volume == 0)
		state = "off";
	else if(Player.volume < 30)
		state = "down";

	$("#speaker").attr("class", "icon " + state + " fa fa-volume-" + state);

	if(Player.muted)
		return $("#muted").show();

	$("#muted").hide();
}

// Called every 500ms
Player.onTick = function()
{
	if(Player.freezeSeekbar)
		return;

	var date = new Date(null);

	if(SoundCloud.player)
	{
		date.setMilliseconds(SoundCloud.player.options.duration);
		$("#total-time").text( date.toISOString().substr(14, 5) );

		if(!SoundCloud.player.isPlaying())
			return;

		$("#seekbar-fill")
			.stop(true, true)
			.animate(
				{"width": (SoundCloud.player.currentTime() / SoundCloud.player.options.duration * 100) + "%"},
				500, "linear"
			);

		date = new Date(null);
		date.setMilliseconds(SoundCloud.player.currentTime());
		$("#current-time").text( date.toISOString().substr(14, 5) );

		SoundCloud.player.setVolume(Player.volume / 100);
		return;
	}

	if(!YouTube.loaded)
		return;

	if(YouTube.player.getPlayerState() == -1)
		return;

	var duration = YouTube.player.getDuration() || 60;
	date.setSeconds(duration);
	$("#total-time").text( date.toISOString().substr(14, 5) );

	if(YouTube.player.getPlayerState() != YT.PlayerState.PLAYING)
		return;

	$("#seekbar-fill")
		.stop(true, true)
		.animate(
			{"width": (YouTube.player.getCurrentTime() / duration * 100) + "%"},
			500, "linear"
		);

	date = new Date(null);
	date.setSeconds(YouTube.player.getCurrentTime());
	$("#current-time").text(date.toISOString().substr(14, 5));

	YouTube.player.setVolume(Player.volume);
}

// Called upon movement of the mouse cursor
Player.onDocumentMouseMove = function(event)
{
	Player.mouseX = event.pageX;
}

// Called upon releasing a mouse button
Player.onDocumentMouseUp = function()
{
	if(typeof Player.dragInterval == "undefined")
		return;

	clearInterval(Player.dragInterval);

	if(Player.draggingVolume)
	{
		Cookie.set("volume", Math.round(Player.volume).toString());
		Player.draggingVolume = false;
		return;
	}

	if(!Player.draggingSeekbar)
		return;

	Player.draggingSeekbar = false;
	setTimeout(Player.unfreezeSeekbar, 500);

	var seek =
		Math.min(
			(Player.mouseX - $("#seekbar").offset().left) / $("#seekbar").width(),
			1
		);

	if(SoundCloud.player)
	{
		if(!SoundCloud.player.isPlaying())
			SoundCloud.player.play();

		SoundCloud.player.seek(seek * SoundCloud.player.options.duration, false);
		return;
	}

	YouTube.player.seekTo(seek * YouTube.player.getDuration(), true);
}

// Called upon clicking the play button
Player.onPlayClick = function()
{
	Player.play();
}

// Called upon clicking the pause button
Player.onPauseClick = function()
{
	Player.pause();
}

// Called upon clicking the previous item button
Player.onPreviousClick = function()
{
	Player.switchItem(Enum.Direction.Previous, Enum.Switch.Manual);
}

// Called upon clicking the next item button
Player.onNextClick = function()
{
	Player.switchItem(Enum.Direction.Next, Enum.Switch.Manual);
}

// Called upon pressing a mouse button on the seekbar
Player.onSeekbarMouseDown = function(event)
{
	if(!SoundCloud.player && (!YouTube.loaded || YouTube.player.getPlayerState() == 5))
		return;

	if(Player.draggingSeekbar)
		return;

	if(event.which != 1)
		return;

	Player.onSeekbarDrag();
	Player.dragInterval = setInterval(Player.onSeekbarDrag, 10);
	Player.draggingSeekbar = true;
	Player.freezeSeekbar = true;
}

// Called upon pressing a mouse button on the volume bar
Player.onVolumeMouseDown = function(event)
{
	if(event.which != 1)
		return;

	Player.onVolumeDrag();
	Player.dragInterval = setInterval(Player.onVolumeDrag, 10);
	Player.draggingVolume = true;
	Player.muted = false;
}

// Called while seekbar is being dragged
Player.onSeekbarDrag = function()
{
	var seek =
		Math.max(
			Math.min(
				(Player.mouseX - $("#seekbar").offset().left) / $("#seekbar").width(),
				1),
			0);

	var date = new Date(null);

	if(SoundCloud.player)
	{
		var milliseconds = seek * SoundCloud.player.options.duration;

		if(!SoundCloud.player.isPlaying())
			SoundCloud.player.play();

		SoundCloud.player.seek(milliseconds, false);

		$("#seekbar-fill")
			.stop(true, true)
			.width((seek * 100) + "%");

		date.setMilliseconds(milliseconds);
		$("#current-time").text(date.toISOString().substr(14, 5));

		return;
	}

	if(!YouTube.loaded)
		return;

	var seconds = seek * YouTube.player.getDuration();
	YouTube.player.seekTo(seconds, false);

	$("#seekbar-fill")
		.stop(true, true)
		.width((seek * 100) + "%");

	date.setSeconds(seconds);
	$("#current-time").text(date.toISOString().substr(14, 5));
}

// Called while volume is being dragged
Player.onVolumeDrag = function()
{
	Player.volume =
		Math.max(
			Math.min(
				(Player.mouseX - $("#volume").offset().left) / $("#volume").width(),
				1),
			0)
		* 100;

	Player.updateVolume();
}

// Called upon clicking the mute toggle button
Player.onSpeakerClick = function()
{
	if(Player.muted && Player.volume < 1)
	{
		Player.volume = Player.lastVolume;
		$("#volume-fill").width( Player.volume / 100 * $("#volume").width() );
		Player.muted = false;
	}
	else
	{
		Player.lastVolume = Player.volume;
		Player.volume = 0;
		$("#volume-fill").width(0);
		Player.muted = true;
	}

	Player.updateVolume();
}

Player.init = function()
{
	$(document).mousemove(Player.onDocumentMouseMove);
	$(document).mouseup(Player.onDocumentMouseUp);

	$("#play").click(Player.onPlayClick);
	$("#pause").click(Player.onPauseClick);
	$("#previous").click(Player.onPreviousClick);
	$("#next").click(Player.onNextClick);
	$("#seekbar").mousedown(Player.onSeekbarMouseDown);
	$("#volume").mousedown(Player.onVolumeMouseDown);
	$("#speaker").click(Player.onSpeakerClick);

	setInterval(Player.onTick, 500);
}

module.exports = Player;
