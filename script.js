window.addEventListener("DOMContentLoaded",function(){
    setTimeout(function(){
      document.getElementById("loaderWrapper").style.display="none";
      document.getElementById("mainContent").style.display="block";
    },3000);
  });
  
  let tela=document.createElement('canvas');
  tela.width=$(window).width();
  tela.height=$(window).height();
  $("body").append(tela);
  let canvas=tela.getContext('2d');
  class Particle{
    constructor(c,p){
      let r=Math.random();
      this.p=0;this.c=c;
      this.x=$(window).width()/2+(Math.random()*200-Math.random()*200);
      this.y=$(window).height()/2+(Math.random()*200-Math.random()*200);
      this.w=$(window).width();
      this.h=$(window).height();
      this.radius=r>.2?Math.random()*1:Math.random()*3;
      this.color=r>.2?"#d8002c":"#F9314C";
      this.radius=r>.8?Math.random()*2:this.radius;
      this.color=r>.8?"#7DFFF2":this.color;
      this.vx1=Math.random()*300;
      this.vx2=Math.random()*400;
      this.vy1=Math.random()*100;
      this.vy2=Math.random()*120;
    }
    render(){
      this.c.beginPath();
      this.c.arc(this.x,this.y,this.radius,0,2*Math.PI);
      this.c.lineWidth=2;
      this.c.fillStyle=this.color;
      this.c.fill();
      this.c.closePath();
    }
    move(){
      this.x+=(Math.sin(this.p/this.vx1)*Math.cos(this.p/this.vx2));
      this.y+=(Math.cos(this.p/this.vy2));
      if(this.x<0||this.x>this.w-this.radius)return false;
      if(this.y<0||this.y>this.h-this.radius)return false;
      this.render();this.p++;return true;
    }
  }
  let particles=[],m=popolate(1000);
  function popolate(n){
    for(let i=0;i<n;i++){
      setTimeout(function(){
        particles.push(new Particle(canvas,i));
      },i*20);
    }
    return particles.length;
  }
  function clear(){
    canvas.globalAlpha=0.05;
    canvas.fillStyle='#2e050d';
    canvas.fillRect(0,0,tela.width,tela.height);
    canvas.globalAlpha=1;
  }
  function update(){
    particles=particles.filter(function(x){return x.move()});
    if(particles.length<m)popolate(1);
    clear();
    requestAnimationFrame(update);
  }
  update();
  
