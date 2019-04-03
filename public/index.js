$(function () {
  
  var socket = io();
  
  $("body").fadeIn();
  
  
  socket.on('connect', function () {

    socket.emit("dashboard_load", { email: getCookie("username"), token: getCookie("token") });
    socket.on("dashboard_load", function(_DATA){

      Vue.filter("nbr", function (value) {return new Intl.NumberFormat().format(value);});
      
      $(".username_txt").text(getCookie("username"));
      
      var side_bar = new Vue({
        el: '.side_bar',
        data: {
          tab: 0
        },
        methods: {
          select: function(e){
            this.tab = e;
            
            var tabName="";
            if (e==0) tabName="dashboard";
            if (e==1) tabName="income";
            if (e==2) tabName="expenses";
            change_tab(tabName)
          }
        }
      })
      
      var side_bar_mobile = new Vue({
        el: '.side_bar_mobile',
        data: {
          show: false,
          tab: 0
        },
        methods: {
          select: function(e){
            this.tab = e;
            var tabName="";
            if (e==0) tabName="dashboard";
            if (e==1) tabName="income";
            if (e==2) tabName="expenses";
            change_tab(tabName)
          }
        }
      })
    
      var header = new Vue({
        el: 'header',
        methods: {
          toggle_sidebar: function(){
            side_bar_mobile.show = !side_bar_mobile.show;
            document.querySelector(".menubtn").classList.toggle("change");
            $(".container").toggleClass("blur");
          }
        }
      })
    
      var dashboard = new Vue({
        el: '#dashboard_vue',
        data:{
          visible: true
        }
      })
      
      var income = new Vue({
        el: '#income_vue',
        data:{
          visible: false,
          total: 7762,
          salary_table: _DATA.salary_table
        }
      })
      
      function change_tab(tab){
        switch (tab) {
          case "dashboard":
          income.visible = false;
          //expenses.visible = false;
          dashboard.visible = true;
          break;
          case "income":
          income.visible = true;
          //expenses.visible = false;
          dashboard.visible = false;
          break;
          case "expenses":
          income.visible = false;
          //expenses.visible = true;
          dashboard.visible = false;
          break;
        }
        header.toggle_sidebar();
      }
      
      
      $(".container").on("click", function(){
        if (side_bar_mobile.show){
          header.toggle_sidebar();
        }
      })
      
      var prevScrollpos = window.pageYOffset;
      window.onscroll = function() {
        if (side_bar_mobile.show){
          header.toggle_sidebar();
        }
        var currentScrollPos = window.pageYOffset;
        if (prevScrollpos > currentScrollPos) {
          $("body").removeClass("short");
        }else{
          $("body").addClass("short");
        }
        prevScrollpos = currentScrollPos;
      }
      
      window.onclick = function(event) {
        if (!event.target.matches('.username')) {
          var dropdowns = document.getElementsByClassName("dropdown-content");
          var i;
          for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
              openDropdown.classList.remove('show');
            }
          }
        }
        if (!event.target.matches('.menubtn') && !event.target.matches('.menubtn div') && !event.target.matches('.side_bar_mobile')) {
          if (side_bar_mobile.show){
            header.toggle_sidebar();
          }
        }
      }
      
      if (GET_("this") == "broken"){
        $('body *').css("transform", "rotate(1deg) translate(2px, 5px)");
      }
      
      setTimeout(function(){
        $(".loader").fadeOut();
        setTimeout(function(){
          $(".body").fadeIn();
        }, 500)
      }, 500)
      
    });
  });
});

function logout(){
  document.cookie = 'session=; Max-Age=-99999999;';
  document.location.reload();
}

function changepassword(){
  document.location.replace("https://cash-flow.usp-3.fr/rspass/" + getCookie("username") + "/" + getCookie("session"));
}

function dropdown_toggle() {
  document.getElementById("dropdown").classList.toggle("show");
  document.querySelector(".username i").classList.toggle("turn");
}

function getCookie(cname) {var name = cname + "=";var decodedCookie = decodeURIComponent(document.cookie);var ca = decodedCookie.split(';');for(var i = 0; i <ca.length; i++){var c = ca[i];while (c.charAt(0) == ' ') {c = c.substring(1);}if (c.indexOf(name) == 0){return c.substring(name.length, c.length);}}return "";}function setCookie(name, value) {document.cookie = name + "=" + value + ";365;path=/";}
function GET_(param){var url = new URL(document.location);return url.searchParams.get(param);}
function copyToClipboard(text){$('#clipboard').text(text);var $temp = $("<input>");$("body").append($temp);$temp.val($('#clipboard').text()).select();document.execCommand("copy");$temp.remove();$('#clipboard').text("");}