/* time */
const showTime = () => {
  const nowTime = document.getElementById('nowTime');
  const date = new Date();
  const hour = date.getHours();
  const min = date.getMinutes();
  const ticking = parseInt( date.getTime() / 500 );
  ticking % 2 ? 
    nowTime.innerHTML = `
    ${hour < 10 ? '0' + hour : hour} <i>:</i> ${min < 10 ? '0' + min : min}
    ` : 
    nowTime.innerHTML = `
    ${hour < 10 ? '0' + hour : hour} <i class="ticking">:</i> ${min < 10 ? '0' + min : min}
    `
}
setInterval(() => {
  showTime()
}, 500);

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

audio.ontimeupdate = () => {
  musicCurrentTime.innerHTML = formatSeconds( audio.currentTime );
  playedProgress.style.width = `${audio.currentTime / audio.duration * 100}%`
  currentProgress.style.left = `${audio.currentTime / audio.duration * 100}%`
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
  playedProgress.style.width = 0
  currentProgress.style.left = 0
}

/* next music */
const nextMusic = () => {
  musicIndex < musicTotal - 1 ? musicIndex += 1 : musicIndex = 0;
  changeMusic( musicIndex );
  playing ? playMusic() : null;
  playedProgress.style.width = 0
  currentProgress.style.left = 0
}

/* handle music time */
totalProgress.onclick = (e) => {
  e.target.id === "currentProgress" ? null :
    audio.currentTime = e.offsetX / totalProgress.offsetWidth * audio.duration;
}

let isDown = false;
let startX
let totalX = 0;

currentProgress.addEventListener('mousedown',
  function(e) {
    isDown = true;
    startX = e.path[1].offsetLeft;
    totalX = e.path[1].offsetWidth;
    document.addEventListener('mousemove', move)
  }
)
document.addEventListener('mouseup', 
  function() {
    isDown = false;
    document.removeEventListener('mousemove', move)
  }
)

const move = (e) => {
  if(isDown) {
    audio.currentTime = (e.pageX - startX) / totalX * audio.duration; 
  }
}
