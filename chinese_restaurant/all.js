/* headerNavbar */
const headerMenu = document.getElementById("headerMenu");
const mobileMenu = document.getElementById("mobileMenu");
const btnBurger = document.getElementById("btn-burger");
/* menu active */
const section = document.querySelectorAll(".section");
const sections = {};
const navLink = document.querySelectorAll(".nav__link");
console.log(navLink)
/* catch section scroll px */
Array.prototype.forEach.call(section, (e) => {
  sections[e.id] = e.offsetTop;
})

/* mobile menu switch */
const openMenu = () => {
  btnBurger.classList.toggle("open");
  mobileMenu.classList.toggle("active");
}
/* listener scroll */
window.onscroll = () => {
  const { scrollTop } = document.documentElement || document.body;
  
  /* headerMenu isTop */
  scrollTop > 100 ? 
    headerMenu.classList.remove("isTop") :
    headerMenu.classList.add("isTop");

  /* mobile menu */
  for (let i in sections) {
    if (sections[i] <= scrollTop + 100) {
      document.querySelector(".active").classList.remove("active");
      document.querySelector(`a[href="#${ i }"]`).classList.add("active");
    }
  }
}
