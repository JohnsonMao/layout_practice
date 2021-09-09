/* audio */
const audio = document.getElementById('audio');

/* music inform */
const cover = document.getElementById('cover');
const author = document.getElementById('author');
const title = document.getElementById('title');

/* timer */
const musicCurrentTime = document.getElementById('musicCurrentTime');
const musicTotalTime = document.getElementById('musicTotalTime');

/* progress */
const totalProgress = document.getElementById('totalProgress');
const playedProgress = document.getElementById('playedProgress');
const currentProgress = document.getElementById('currentProgress');

/* playBtn */
const playBtn = document.getElementById('playBtn');

/* music playing state */
let playing = false;
/* music data index */
let musicIndex = 0;
const musicTotal = musicData.length;

/* change music */
const changeMusic = (musicIndex) => {
  audio.src = musicData[musicIndex].src;
  cover.src = musicData[musicIndex].cover;
  author.innerHTML = musicData[musicIndex].author;
  title.innerHTML = musicData[musicIndex].title;
  audio.ondurationchange = () =>{
    musicTotalTime.innerHTML = formatSeconds( audio.duration );
  }
}
changeMusic( musicIndex );

console.log(audio)

audio.ontimeupdate = () => {
  musicCurrentTime.innerHTML = formatSeconds( audio.currentTime );
  currentProgress.style.width = `${musicCurrentTime / musicTotalTime}%`
}

/* play music */
const playMusic = () => {
  playBtn.classList.toggle("active")
  playing ? audio.pause() : audio.play();
  playing = !playing;
}

/* previous music */
const prevMusic = () => {
  musicIndex > 0 ? musicIndex -= 1 : musicIndex = musicTotal - 1;
  changeMusic( musicIndex );
  playing ? playMusic() : null;
}

/* next music */
const nextMusic = () => {
  musicIndex < musicTotal - 1 ? musicIndex += 1 : musicIndex = 0;
  changeMusic( musicIndex );
  playing ? playMusic() : null;
}

/* handle music time */
const handleMusic = () => {
  console.log(playedProgress.offsetWidth, '/', totalProgress.offsetWidth)
}