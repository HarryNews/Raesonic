var Local = require("./Local.js");

var YouTube = require("../api/YouTube.js");
var SoundCloud = require("../api/SoundCloud.js");

var Player =
{
	playing: false, // Player state is set to playing
	volume: Local.get("volume", 80), // Playback volume
	lastVolume: 0, // Playback volume before muting
	muted: false, // Sound is muted by the user
	loopEnabled: false, // Loop the current track
	draggingSeekbar: false, // Seekbar is being dragged
	freezeSeekbar: false, // Disable seekbar animation
	draggingVolume: false, // Volume bar is being dragged
	mouseX: 0, // Horizontal position of the mouse cursor
	RELATIVE_SEEK: true,
}

// Start track playback
Player.play = function()
{
	// Play the first item if none are active
	if( !$(".item.active").length )
	{
		Player.setItem( $(".item:first") );
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
	
	Player.playing = true;

	$("#play").hide();
	$("#pause").show();
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

	Player.playing = false;

	$("#pause").hide();
	$("#play").show();

	$("#seekbar-fill").finish();
}

// Toggle playback state
Player.toggle = function()
{
	Player.playing
		? Player.pause()
		: Player.play();
}

// Seek to a certain position of the track, accepts number from 0 to 1
Player.seekTo = function(seek, isRelative)
{
	if(isRelative)
	{
		if( !SoundCloud.player &&
			( !YouTube.loaded || YouTube.player.getPlayerState() == 5 ) )
				return;

		seek =
			Math.max(
				Math.min(
					$("#seekbar-fill").width() /
					$("#seekbar").width() + seek,
					1),
				0);

		$("#seekbar-fill")
			.stop(true, true)
			.width( $("#seekbar").width() * seek );

		Player.freezeSeekbar = true;
		setTimeout(Player.unfreezeSeekbar, 500);
	}

	if(SoundCloud.player)
	{
		if( !SoundCloud.player.isPlaying() )
			SoundCloud.player.play();

		if(seek == 1)
			return SoundCloud.onPlayerStateChange("ended");

		SoundCloud.player
			.seek(seek * SoundCloud.player.options.duration, false);

		return;
	}

	YouTube.player
		.seekTo(seek * YouTube.player.getDuration(), true);
}

// Play specified item
Player.setItem = function($item, isManualSwitch)
{
	// Item doesn't exist, bail out
	if(!$item.length)
		return;

	// Item is already active, toggle playback and bail out
	if($item.is(".active"))
	{
		Player.toggle();
		return;
	}

	var data = $item.data();
	var artist = $(".artist", $item).html();
	var title = $(".title", $item).html();

	$("#meta-artist").html(artist);
	$("#meta-title").html(title);

	$("#items .item").removeClass("active");

	$("#related-first-image").empty();

	var ItemList = require("./ItemList.js");
	ItemList.scrollTo($item);

	if(SoundCloud.player)
	{
		SoundCloud.player.pause();
		SoundCloud.player.dispose();
		SoundCloud.player = null;
	}

	$("#seekbar-buffer, #seekbar-fill")
		.stop(true, true)
		.width(0);

	$("#current-time, #total-time").text("00:00");

	var Content = require("./Content.js");
	Content.onItemChange($item);

	// Update the related tab if viewing recommendations
	if(data.rating != null)
	{
		var Relation = require("./Relation.js");
		Relation.onRelationItemChange($item, artist, title);
	}

	// Search for content if none is assigned to the item
	if(!data.sourceId)
	{
		ItemList.setActiveItem($item, isManualSwitch);
		Content.request(data.trackId, Content.ASSIGN_TO_ITEM);
		return;
	}

	if(data.sourceId == Content.SOURCE.YOUTUBE)
	{
		ItemList.setActiveItem($item, isManualSwitch);

		if(!YouTube.loaded)
			return YouTube.onPlayerError();

		$("#cover").empty().hide();
		$("#video").show();

		var externalId = data.externalId;
		YouTube.player.loadVideoById(externalId);

		var imageUrl =
			"http://img.youtube.com/vi/" + externalId + "/0.jpg";

		$("#content-image")
			.append(
				$("<img>")
					.attr("src", imageUrl)
					.addClass("wide")
			);

		// Update the related tab if viewing recommendations
		if(data.rating != null)
			$("#related-first-image").html( $("#content-image").html() );

		return;
	}

	if(data.sourceId == Content.SOURCE.SOUNDCLOUD)
	{
		ItemList.setActiveItem($item, isManualSwitch);

		if(YouTube.loaded)
		{
			YouTube.player.stopVideo();
			YouTube.player.clearVideo();
		}

		$("#video").hide();
		$("#cover").empty();

		var trackString = "/tracks/" + data.externalId;

		if(typeof SC == "undefined")
			return SoundCloud.onPlayerError();

		SC
		.get(trackString)
		.then(function onSoundCloudResponse(response, error)
		{
			var imageUrl =
				response.artwork_url || response.user.avatar_url;

			if(imageUrl)
			{
				var largeImageUrl = imageUrl.replace("large", "t500x500");
				var smallImageUrl = imageUrl.replace("large", "t300x300");

				$("#cover")
					.append(
						$("<div>")
							.addClass("back")
							.click(Player.toggle)
							.append(
								$("<img>")
									.attr("src", largeImageUrl)
							),
						$("<div>")
							.addClass("front")
							.click(Player.toggle)
							.append(
								$("<img>")
									.attr("src", largeImageUrl)
							)
					);

				$("#content-image")
					.append(
						$("<img>")
							.attr("src", smallImageUrl)
					);

				// Update the related tab if viewing recommendations
				if(data.rating != null)
					$("#related-first-image")
						.html( $("#content-image").html() );
			}

			$("#cover")
				.append(
					$("<a>")
						.attr({ href: response.permalink_url, target: "_blank" })
						.click(Player.pause)
						.append(
							$("<div>")
								.attr("id", "soundcloud")
								.addClass("soundcloud icon")
						)
				);

			$("#cover")
				.append(
					$("<a>")
						.attr
						({
							href: response.user.permalink_url,
							target: "_blank",
							id: "creator",
						})
						.text(response.user.username)
						.delay(5000)
						.fadeOut(2000)
					)
				.show();

			$("#cover")
				.unbind()
				.hover(SoundCloud.onCoverHoverIn,
					SoundCloud.onCoverHoverOut);
		})
		.catch(function(error)
		{
			SoundCloud.onPlayerError(error);
		});

		SC.stream(trackString).then(function(trackPlayer)
		{
			SoundCloud.player = trackPlayer;
			SoundCloud.player.play();
			SoundCloud.player.setVolume(Player.volume / 100);

			SoundCloud.player
				.on("state-change", SoundCloud.onPlayerStateChange);
		});

		return;
	}
}

// Remove active content
Player.clearContent = function()
{
	if(!YouTube.loaded)
		return;

	YouTube.player.stopVideo();
	YouTube.player.clearVideo();

	$("#video").hide();

	$("#cover")
		.empty()
		.append(
			$("<p>")
				.addClass("content-error")
				.text("No content available")
		)
		.show();

	$("#content-nav").empty();
}

// Play next/previous item
Player.switchItem = function(forward, isManualSwitch)
{
	if(!isManualSwitch && Player.loopEnabled)
		return Player.seekTo(0);

	var ItemList = require("./ItemList.js");
	var $item = ItemList.getSwitchItem(forward, isManualSwitch);

	// No switch possible or required
	if(!$item)
		return;

	var Item = require("./Item.js");
	Item.play($item, isManualSwitch);
}

// Enable seekbar animation
Player.unfreezeSeekbar = function()
{
	Player.freezeSeekbar = false;
}

// Mute or unmute the player volume
Player.toggleMute = function()
{
	if(Player.muted && Player.volume < 1)
	{
		Player.volume = Player.lastVolume;
		$("#volume-fill").width( Player.volume / 100 * $("#volume").width() );
		Player.muted = false;
		Player.updateVolume();
		return;
	}

	Player.lastVolume = Player.volume;
	Player.volume = 0;
	$("#volume-fill").width(0);
	Player.muted = true;
	Player.updateVolume();
}

// Update volume of the external players and the volume bar elements
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

	var volume = (!Player.muted)
		? Player.volume
		: Player.lastVolume;

	var state = "loud";

	if(volume == 0)
		state = "silent";
	else if(volume < 30 || Player.muted)
		state = "quiet";
	else if(volume < 60)
		state = "normal";

	$("#speaker").attr("class", "speaker" + state + " icon");
	$("#muted").toggle(Player.muted);

	$("#volume-on").toggle(!Player.muted && Player.volume > 0);
	$("#volume-fill").width(Player.volume + "%");
	$("#volume-tip").text( Math.ceil(Player.volume) + "%" );
}

// Called every 500ms
Player.onTick = function()
{
	if(Player.freezeSeekbar)
		return;

	var date = new Date(null);

	if(SoundCloud.player)
	{
		// If there is a more convenient way to get loaded fraction, please let me know
		if(SoundCloud.player.controller)
		{
			var html5Audio = SoundCloud.player.controller._html5Audio;

			if(typeof html5Audio != "undefined" && html5Audio.buffered.length)
			{
				var buffered = html5Audio.buffered.end(0) * 1000;

				$("#seekbar-buffer")
					.stop(true, true)
					.animate(
						{"width": (buffered /
							SoundCloud.player.options.duration * 100) + "%"},
						500, "linear"
					);
			}
		}

		date.setMilliseconds(SoundCloud.player.options.duration);
		$("#total-time").text( date.toISOString().substr(14, 5) );

		// Audio is not playing, bail out
		if(!SoundCloud.player.isPlaying())
			return;

		$("#seekbar-fill")
			.stop(true, true)
			.animate(
				{"width": (SoundCloud.player.currentTime() /
					SoundCloud.player.options.duration * 100) + "%"},
				500, "linear"
			);

		date = new Date(null);
		date.setMilliseconds( SoundCloud.player.currentTime() );

		$("#current-time, #seekbar-tip")
			.text( date.toISOString().substr(14, 5) );

		SoundCloud.player.setVolume(Player.volume / 100);
		return;
	}

	if(!YouTube.loaded)
		return;

	var youtubeState = YouTube.player.getPlayerState();

	// Playback hasn't started or is cued, don't update total time
	if(youtubeState == -1 || youtubeState == YT.PlayerState.CUED)
		return;

	$("#seekbar-buffer")
		.stop(true, true)
		.animate(
			{"width": (YouTube.player.getVideoLoadedFraction() * 100) + "%"},
			500, "linear"
		);

	var duration = YouTube.player.getDuration() || 0;
	date.setSeconds(duration);
	$("#total-time").text( date.toISOString().substr(14, 5) );

	// Video is not playing, bail out
	if(youtubeState != YT.PlayerState.PLAYING)
		return;

	$("#seekbar-fill")
		.stop(true, true)
		.animate(
			{"width": (YouTube.player.getCurrentTime() /
				duration * 100) + "%"},
			500, "linear"
		);

	date = new Date(null);
	date.setSeconds( YouTube.player.getCurrentTime() );

	$("#current-time, #seekbar-tip")
		.text( date.toISOString().substr(14, 5) );

	YouTube.player.setVolume(Player.volume);
}

// Called upon a playback error
Player.onPlaybackError = function()
{
	var Content = require("./Content.js");
	var ItemList = require("./ItemList.js");
	var Item = require("./Item.js");

	if(Content.preventSwitch)
		return;

	var skipTrack = !Item.active.isManualSwitch;

	Content.switchContent(Content.AUTO_SWITCH,
		ItemList.NEXT_ITEM, skipTrack);
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
		Local.set( "volume", Math.round(Player.volume).toString() );
		Player.draggingVolume = false;
		$("#volume-tip").removeClass("visible");

		return;
	}

	if(!Player.draggingSeekbar)
		return;

	Player.draggingSeekbar = false;
	$("#seekbar-tip").removeClass("visible");
	setTimeout(Player.unfreezeSeekbar, 500);

	var seek =
		Math.min(
			(Player.mouseX -
				$("#seekbar").offset().left) / $("#seekbar").width(),
			1
		);

	Player.seekTo(seek);
}

// Called when a key is pressed somewhere
Player.onDocumentKeyDown = function(event)
{
	// Focus is on the input field, bail out
	if( $("input:focus, textarea:focus").length )
		return;

	switch(event.keyCode)
	{
		case 13: // Enter
		case 32: // Space
		{
			Player.toggle();
			return;
		}
		case 37: // Arrow Left
		{
			if(!event.shiftKey)
			{
				Player.seekTo(-0.05, Player.RELATIVE_SEEK);
				return;
			}

			var ItemList = require("./ItemList.js");
			Player.switchItem(ItemList.PREVIOUS_ITEM, ItemList.MANUAL_SWITCH);
			return;
		}
		case 39: // Arrow Right
		{
			if(!event.shiftKey)
			{
				Player.seekTo(0.05, Player.RELATIVE_SEEK);
				return;
			}

			var ItemList = require("./ItemList.js");
			Player.switchItem(ItemList.NEXT_ITEM, ItemList.MANUAL_SWITCH);
			return;
		}
		case 38: // Arrow Up
		{
			if(!event.shiftKey)
				return;

			Player.volume = Math.min(Player.volume + 5, 100);
			Local.set( "volume", Math.round(Player.volume).toString() );
			Player.updateVolume();
			return;
		}
		case 40: // Arrow Down
		{
			if(!event.shiftKey)
				return;

			Player.volume = Math.max(Player.volume - 5, 0);
			Local.set( "volume", Math.round(Player.volume).toString() );
			Player.updateVolume();
			return;
		}
		case 77: // M
		{
			Player.toggleMute();
			return;
		}
		default:
		{
			return;
		}
	}
}

// Called upon clicking the active track artist
Player.onMetaArtistClick = function(event)
{
	// The click was not on the inner span
	if(event.target == this)
		return;

	var Item = require("./Item.js");

	if(!Item.active)
		return;

	if(Item.active.trackId == -1)
	{
		var Toast = require("./Toast.js");
		Toast.show("No artist name to search for", Toast.ERROR)
		return;
	}

	var $artist = $(event.target);
	var artist = $artist.text();
	var artist = Item.restoreArtist(artist, true);

	var Search = require("./Search.js");
	Search.globallyThrottled("artist: " + artist);
}

// Called upon clicking the active track title
Player.onMetaTitleClick = function()
{
	var Item = require("./Item.js");

	if(!Item.active)
		return;

	if(Item.active.trackId == -1)
	{
		var Toast = require("./Toast.js");
		Toast.show("No track name to search for", Toast.ERROR)
		return;
	}

	var title = Item
		.restoreTitle(Item.active.title);

	var Search = require("./Search.js");

	if( title.indexOf(" Cover)") != -1)
	{
		// Look up the original track
		var artistIndex = title.lastIndexOf("(") + 1;
		var artist = title.slice(artistIndex, -7);
		title = title.slice(0, artistIndex - 2);
		Search.globallyThrottled(artist + " – " + title);
		return;
	}

	// Look up the alternate versions
	var artist = Item.restoreArtist(Item.active.artist, true);
	title = title.replace(/\s\(.+\)/g, "");
	Search.globallyThrottled(artist + " – " + title);
}

// Called upon clicking the loop icon
Player.onLoopIconClick = function()
{
	Player.loopEnabled = !Player.loopEnabled;

	var $icon = $(this);
	$icon.toggleClass("active", Player.loopEnabled);
}

// Called upon clicking the shuffle icon
Player.onShuffleIconClick = function()
{
	var ItemList = require("./ItemList.js");
	ItemList.shuffleEnabled = !ItemList.shuffleEnabled;

	ItemList.setShuffle(ItemList.shuffleEnabled);

	var $icon = $(this);
	$icon.toggleClass("active", ItemList.shuffleEnabled);
}

// Called upon clicking the play icon
Player.onPlayIconClick = function()
{
	Player.play();
}

// Called upon clicking the pause icon
Player.onPauseIconClick = function()
{
	Player.pause();
}

// Called upon clicking the previous item icon
Player.onPreviousIconClick = function()
{
	var ItemList = require("./ItemList.js");
	Player.switchItem(ItemList.PREVIOUS_ITEM, ItemList.MANUAL_SWITCH);
}

// Called upon clicking the next item icon
Player.onNextIconClick = function()
{
	var ItemList = require("./ItemList.js");
	Player.switchItem(ItemList.NEXT_ITEM, ItemList.MANUAL_SWITCH);
}

// Called upon pressing a mouse button on the seekbar
Player.onSeekbarMouseDown = function(event)
{
	if( !SoundCloud.player &&
		( !YouTube.loaded || YouTube.player.getPlayerState() == 5 ) )
			return;

	if(Player.draggingSeekbar)
		return;

	if(event.which != 1)
		return;

	Player.draggingSeekbar = true;
	Player.freezeSeekbar = true;

	Player.onSeekbarDrag();
	Player.dragInterval = setInterval(Player.onSeekbarDrag, 10);

	$("#seekbar-tip").addClass("visible");
}

// Called upon pressing a mouse button on the volume bar
Player.onVolumeMouseDown = function(event)
{
	if(event.which != 1)
		return;
	
	Player.draggingVolume = true;
	Player.muted = false;

	Player.onVolumeDrag();
	Player.dragInterval = setInterval(Player.onVolumeDrag, 10);

	$("#volume-tip").addClass("visible");
}

// Called while seekbar is being dragged
Player.onSeekbarDrag = function()
{
	var seek =
		Math.max(
			Math.min(
				(Player.mouseX -
					$("#seekbar").offset().left) / $("#seekbar").width(),
				1),
			0);

	var date = new Date(null);

	if(SoundCloud.player)
	{
		var milliseconds = seek * SoundCloud.player.options.duration;

		if( !SoundCloud.player.isPlaying() )
			SoundCloud.player.play();

		SoundCloud.player.seek(milliseconds, false);

		$("#seekbar-fill")
			.stop(true, true)
			.width((seek * 100) + "%");

		date.setMilliseconds(milliseconds);

		$("#current-time, #seekbar-tip")
			.text( date.toISOString().substr(14, 5) );

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

	$("#current-time, #seekbar-tip")
		.text( date.toISOString().substr(14, 5) );
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
Player.onSpeakerIconClick = function()
{
	Player.toggleMute();
}

Player.init = function()
{
	$(document).mousemove(Player.onDocumentMouseMove);
	$(document).mouseup(Player.onDocumentMouseUp);
	$(document).keydown(Player.onDocumentKeyDown);

	$("#meta-artist").click(Player.onMetaArtistClick);
	$("#meta-title").click(Player.onMetaTitleClick);
	$("#loop").click(Player.onLoopIconClick);
	$("#shuffle").click(Player.onShuffleIconClick);
	$("#play").click(Player.onPlayIconClick);
	$("#pause").click(Player.onPauseIconClick);
	$("#previous").click(Player.onPreviousIconClick);
	$("#next").click(Player.onNextIconClick);
	$("#seekbar").mousedown(Player.onSeekbarMouseDown);
	$("#volume").mousedown(Player.onVolumeMouseDown);
	$("#speaker").click(Player.onSpeakerIconClick);

	Player.updateVolume();

	setInterval(Player.onTick, 500);
}

module.exports = Player;
