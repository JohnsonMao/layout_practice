const headerMenu = document.getElementById("headerMenu");
const navLink = document.querySelectorAll(".nav__link");
const mobileMenu = document.getElementById("mobileMenu");
const btnBurger = document.getElementById("btn-burger");

window.addEventListener("scroll", () => {
  const { scrollTop } = document.documentElement;
  
  /* headerMenu isTop */
  scrollTop > 100 ? 
    headerMenu.classList.remove("isTop") :
    headerMenu.classList.add("isTop");

  /* nav__link active */
  scrollTop < 580 ?
    navLink[0].classList.add("active") :
    navLink[0].classList.remove("active");

  scrollTop > 580 && scrollTop < 1750 ?
    navLink[1].classList.add("active") :
    navLink[1].classList.remove("active");

  scrollTop > 1750 && scrollTop < 2500 ?
    navLink[2].classList.add("active") :
    navLink[2].classList.remove("active");
  
  scrollTop > 2500 ?
    navLink[3].classList.add("active") :
    navLink[3].classList.remove("active");
});

const openMenu = () => {
  btnBurger.classList.toggle("open");
  mobileMenu.classList.toggle("active");
}