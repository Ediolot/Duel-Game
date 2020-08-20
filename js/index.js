
/* CONFIGURATION */

var FPS        =   60,  /* Frames per second                   */
    BOUNCE     = 0.85,  /* Collision energy conservation ratio */
    FRICTION   = 0.99,  /* Air friction ratio                  */
    GRAVITY    = 0.10,  /* Gravity                             */
    STICKS_K   =    1,  /* Sticks K constant                   */
    ITERATIONS =    5,  /* Iterations on sticks calculations   */
    WIND       = false, /* Activate wind                       */
    WIND_FORCE =   10;  /* Wind force                          */

var CLOTH_SX = 33,      /* Number of points for x axis */
    CLOTH_SY = 33;      /* Number of points for y axis */

var STICKS_SIZE =  10,  /* Size of the sticks               */
    STICKS_MAX  = 600;  /* Max allowed sticks expansion (%) */

var MOUSE_FORCE =   1,  /* Force without click */
    MULT_FORCE  = 3.0;  /* Force with click    */



var MAX_PARTICLES  = 500,
    PARTICLES_SIZE =  30,
    X_MULTIPLIER   =  50,
    Y_MULTIPLIER   =   5,
    UPDATE_SPEED   =  100;

var VERTICAL_SPEED   = 2.5,
    HORIZONTAL_SPEED = 2.2,
    FADE_SPEED       = 0.007;

var HIT_RANGE        =  100,
    HIT_SPEED_SKEL   =  800,
    HIT_RETARD_SKEL  =  370,
    HIT_SPEED_PLAYER = 1200,
    PLAYER_SPEED     =    3;

var SCENARIO_SIZE = 200;

var PI_double = 2*Math.PI;

/* Program variables */

var render_area   = true,
    render_sticks = true,
    render_points = false,
    show_picture  = true;

var fps_last_time,
    pause_game,
    fps_time,
    fps_count,
    background_gradient,
    skel_wins,
    player_wins,
    player_lifes,
    skel_lifes,
    max_x,
    min_x,
    cloth_x,
    cloth_y,
    clothID,
    fireID,
    flag_canvas_w,
    flag_canvas_h,
    flag_canvas,
    fire1_canvas_w,
    fire1_canvas_h,
    fire1_canvas,
    fire2_canvas_w,
    fire2_canvas_h,
    fire2_canvas,
    fire2_context,
    fire1_context,
    flag_context;

var main_audio,
    swing1_audio,
    swing2_audio;

var keyMap = [];

var fire1_parts = [];
var fire2_parts = [];

var points  = [];
var sticks  = [];
var squares = [];
var mousePos = {
    x:    0,
    y:    0,
    movx: 0,
    movy: 0,
    force_multiplier: MOUSE_FORCE
}

var torch_left     = document.getElementById('torch_left'    ),
    torch_right    = document.getElementById('torch_right'   ),
    player         = document.getElementById('character'     ),
    upper_player   = document.getElementById('upper'         ),
    down_player    = document.getElementById('down'          ),
    mob            = document.getElementById('skeleton'      ),
    upper_skel     = document.getElementById('upper_skel'    ),
    down_skel      = document.getElementById('down_skel'     ),
    heart1         = document.getElementById('heart1'        ),
    heart2         = document.getElementById('heart2'        ),
    heart3         = document.getElementById('heart3'        ),
    heart4         = document.getElementById('heart4'        ),
    heart5         = document.getElementById('heart5'        ),
    heart6         = document.getElementById('heart6'        ),
    counter_player = document.getElementById('counter_player'),
    counter_skel   = document.getElementById('counter_skel'  );

/* FUNCTIONS */

function getPoint(row,col)
{
    return points[(col)+(row)*CLOTH_SX];
}

function getStick(type, row, col)
{
    return type=="vert" ? sticks[(col)+(row)*CLOTH_SX] : sticks[CLOTH_SX*(CLOTH_SY-1)+(col)+(row)*(CLOTH_SX-1)];
}

function getSquare(row,col)
{
    return squares[(col)+(row)*(CLOTH_SX-1)];
}

function createSticks()
{
    /* Add down-up sticks */
    for (var i=1; i<CLOTH_SY; ++i)
        for (var j=0; j<CLOTH_SX; ++j)
        {
            var dx = getPoint(i,j).y - getPoint(i-1,j).y;

            ++getPoint(i-1,j).sticks;
            ++getPoint(i  ,j).sticks;

            sticks.push({
                distance: dx,
                hide:     false,
                p0:       getPoint(i-1,j),
                p1:       getPoint(i  ,j)
            });
        }

    /* Add right-left sticks */
    for (var i=0; i<CLOTH_SY; ++i)
        for (var j=1; j<CLOTH_SX; ++j)
        {
            var dy = getPoint(i,j).x - getPoint(i,j-1).x;

            ++getPoint(i,j-1).sticks;
            ++getPoint(i,j  ).sticks;

            sticks.push({
                distance: dy,
                hide:     false,
                p0:       getPoint(i,j-1),
                p1:       getPoint(i,j  )
            });
        }
}

function createSquares()
{
    for (var i=0; i<(CLOTH_SY-1); ++i)
        for (var j=0; j<(CLOTH_SX-1); ++j)

            squares.push({
                s0: getStick("hori",i  ,j  ),
                s1: getStick("hori",i+1,j  ),
                s2: getStick("vert",i  ,j  ),
                s3: getStick("vert",i  ,j+1)
            });
}

function createPoints()
{
    for (var i=0; i<CLOTH_SY; ++i)
        for (var j=0; j<CLOTH_SX; ++j)
            points.push({
                sticks: 0,
                fixed:  i==0,
                oldx:   cloth_x+j*STICKS_SIZE,
                oldy:   cloth_y+i*STICKS_SIZE,
                x:      cloth_x+j*STICKS_SIZE,
                y:      cloth_y+i*STICKS_SIZE
            });
}

function updatePoints()
{
    var vx,
        vy;

    points.forEach(function (e)
    {
        if (!e.fixed)
        {
            vx = (e.x - e.oldx)*FRICTION;
            vy = (e.y - e.oldy)*FRICTION;

            e.oldx = e.x;
            e.oldy = e.y;
            e.x += vx;
            e.y += vy;
            e.y += GRAVITY;

            /* Mouse force */
            var dx = mousePos.x-e.x,
                dy = mousePos.y-e.y;

            if (dx>-20 && dx<20 && dy>-20 && dy<20)
            {
                e.x -= dx*mousePos.force_multiplier;
                e.y -= dy*mousePos.force_multiplier;
            }

            if (WIND)
            {
                e.y += Math.random()-0.5;
                e.x += (WIND_FORCE/e.x);
            }
        }
    });
}

function updateSticks()
{
    sticks.forEach(function (e)
    {
        if (!e.hide)
        {
            var dx = e.p1.x - e.p0.x,
                dy = e.p1.y - e.p0.y,
                distance = Math.sqrt(dx*dx + dy*dy),
                diff = e.distance - distance,
                percent = diff / distance / 2,
                offsetX = dx * percent * STICKS_K,
                offsetY = dy * percent * STICKS_K;

            if (!e.p0.fixed)
            {
                e.p0.x -= offsetX;
                e.p0.y -= offsetY;
            }
            if (!e.p1.fixed)
            {
                e.p1.x += offsetX;
                e.p1.y += offsetY;
            }

            if (distance > STICKS_SIZE*STICKS_MAX/100)
            {
                e.hide = true;
                if ((--e.p0.sticks) == 0)
                    points.splice(points.indexOf(e.p0),1);

                if ((--e.p1.sticks) == 0)
                    points.splice(points.indexOf(e.p1),1);
            }
        }
    });
}

function updateFireParticle(part, x, y)
{
    part.x = x + X_MULTIPLIER*(0.5-Math.random()),
    part.y = y,
    part.color = [
        255,
        ~~ (100+Math.random()*20), /* Faster round */
        0,
        0.8
    ];
}

function updateFire(array, x, y, add_circles)
{
    if (array.length<MAX_PARTICLES && add_circles)
    {
        var newpart = {};
        updateFireParticle(newpart, x, y);
        array.push(newpart);
    }

    array.forEach(function (e) {
        e.color[3] -= FADE_SPEED*Math.random();
        if (e.color[3] > 0)
        {
            e.color[1] = e.color[1] < 160 ? e.color[1]+1 : 160;
            e.y -= VERTICAL_SPEED*Math.random();
            e.x += HORIZONTAL_SPEED*(0.5-Math.random());
        }
        else
        {
            add_circles = false;
            updateFireParticle(e, x, y);
        }
    });

    return add_circles;
}

function checkCollisions()
{
    var vx, vy;

    points.forEach(function (e)
    {
        vx = e.x - e.oldx;
        vy = e.y - e.oldy;

        if (e.x > flag_canvas_w)
        {
            e.x = flag_canvas_w;
            e.oldx = e.x + vx*BOUNCE;
        }
        else if (e.x < 0)
        {
            e.x = 0;
            e.oldx = e.x + vx*BOUNCE;
        }
        else if (e.y > flag_canvas_h)
        {
            e.y = flag_canvas_h;
            e.oldy = e.y + vy*BOUNCE;
        }
        else if (e.y < 0)
        {
            e.y = 0;
            e.oldy = e.y + vy*BOUNCE;
        }
    });
}

function renderSticks()
{
    if (show_picture)
        flag_context.strokeStyle = "rgb(100,100,100)";
    else
        flag_context.strokeStyle = "rgb(74,0,7)";

    flag_context.beginPath();
    sticks.forEach(function (e) {
        if (!e.hide)
        {
            flag_context.moveTo(e.p0.x, e.p0.y);
            flag_context.lineTo(e.p1.x, e.p1.y);
        }
    });
    flag_context.stroke();
}

function renderPoints()
{
    flag_context.strokeStyle = "rgb(255,255,255)";
    flag_context.beginPath();
    points.forEach(function (e) {
            flag_context.rect(e.x,e.y,1,1);
    });
    flag_context.stroke();
}

function renderArea()
{
    if (!show_picture)
        flag_context.fillStyle = "rgb(144,0,32)";

    squares.forEach(function (e, index) {
        if (!e.s0.hide && !e.s1.hide && !e.s2.hide && !e.s3.hide)
        {
            if (show_picture)
                flag_context.fillStyle = "rgb(" + img_r[index] + "," +
                                                  img_g[index] + "," +
                                                  img_b[index] + ")";

            flag_context.beginPath();
            flag_context.moveTo(e.s2.p0.x,e.s2.p0.y);
            flag_context.lineTo(e.s2.p1.x,e.s2.p1.y);
            flag_context.lineTo(e.s3.p1.x,e.s3.p1.y);
            flag_context.lineTo(e.s3.p0.x,e.s3.p0.y);
            flag_context.closePath();
            flag_context.fill();
        }
    });
}

function renderFire(array, context, w, h)
{
    context.clearRect(0, 0, w, h);

    array.forEach(function (e) {
        context.fillStyle = "rgba(" + e.color[0] + "," +
                                      e.color[1] + "," +
                                      e.color[2] + "," +
                                      e.color[3] + ")";
        context.beginPath();
        context.arc(e.x,e.y,PARTICLES_SIZE,0,PI_double);
        context.fill();
    });
}

var updateFireSimulation = (function ()
{
    var fire1_add_circles = true;
    var fire2_add_circles = true;
    return function ()
    {
        renderFire(fire1_parts, fire1_context, fire1_canvas_w, fire1_canvas_h);
        renderFire(fire2_parts, fire2_context, fire2_canvas_w, fire2_canvas_h);
        fire1_add_circles = updateFire(fire1_parts, fire1_canvas_w/2, fire1_canvas_h, fire1_add_circles);
        fire2_add_circles = updateFire(fire2_parts, fire1_canvas_w/2, fire1_canvas_h, fire2_add_circles);
    };
})();

function updateClothSimulation()
{

    flag_context.fillStyle=background_gradient;
    flag_context.fillRect(0, 0, flag_canvas_w, flag_canvas_h);

    if (render_sticks) renderSticks();
    if (render_area)   renderArea()  ;
    if (render_points) renderPoints();

    updatePoints();

    for (var i=0; i<ITERATIONS; ++i)
        updateSticks();

    checkCollisions();

    var now = window.performance.now();
    fps_time += now-fps_last_time;
    fps_last_time = now;
    if (++fps_count==100)
    {
        document.getElementById('fps_count').innerHTML = 'FPS: '+(100000/fps_time).toFixed();
        fps_time = fps_count = 0;
    }
}

function updateGameState()
{
    checkKeysPlayer();
    updateMob();
}

function checkKeysPlayer()
{
    var speed=0;
    if (keyMap[68])
        speed = +PLAYER_SPEED;

    else if (keyMap[65])
        speed = -PLAYER_SPEED;

    if (keyMap[16])
        attack();

    updateMovement(player, speed, keyMap[32]);
}

function relCharacterPosX()
{
    var player_x        = Number( player.getAttribute('data-x'      )        ),
        player_facing_r = Boolean(player.getAttribute('data-facingr')=='true');

    player_x += player_facing_r ? 10 : 15;
    return player_x;
}

function relMobPosX()
{
    var mob_x        = Number( mob.getAttribute('data-x'      )        ),
        mob_facing_r = Boolean(mob.getAttribute('data-facingr')=='true');

    mob_x += mob_facing_r ? 20 : 35;
    return mob_x;
}

function updateMovement(player, speed, jump)
{
    if (pause_game)
        return;

    var y        = Number( player.getAttribute('data-y'      )        ),
        x        = Number( player.getAttribute('data-x'      )        ),
        jy       = Number( player.getAttribute('data-jump_y' )        ),
        sy       = Number( player.getAttribute('data-speed_y')        ),
        ay       = Number( player.getAttribute('data-accel_y')        ),
        last_sx  = Number( player.getAttribute('data-speed_x')        ),
        facing_r = Boolean(player.getAttribute('data-facingr')=='true'),
        sx = (jy==0 ? speed : last_sx);

    x += sx;
    if (x > max_x)
        x -= sx;
    else if (x < min_x)
        x -= sx;

    if (jy==0 && jump)
        sy = 6;
    else
    {
        sy = (jy+sy) <= 0 ? 0 : sy+ay;
        jy = (jy+sy) <= 0 ? 0 : jy+sy;
    }

    if (speed!=0)
        facing_r = speed>0;

    if (jy<=0 && sx!=0)
        down.classList.add('animate_walk');
    else
        down.classList.remove('animate_walk');

    player.setAttribute('data-x'      , x       );
    player.setAttribute('data-y'      , y       );
    player.setAttribute('data-jump_y' , jy      );
    player.setAttribute('data-speed_x', sx      );
    player.setAttribute('data-speed_y', sy      );
    player.setAttribute('data-facingr', facing_r);
    player.style.transform = "translate(" + (facing_r ? x : x-50) + "px, " + (y-jy) + "px) scale(" + (facing_r ? 1 : -1) + ",1)";
}

var attack = (function ()
{
    var attack_ready = true;

    return function ()
    {
        if (pause_game)
            return;

        if (attack_ready)
        {
            var player_x = Number(player.getAttribute('data-x'     )),
                player_y = Number(player.getAttribute('data-jump_y')),
                y        = Number(   mob.getAttribute('data-y'     )),
                x        = Number(   mob.getAttribute('data-x'     ));

            swing2_audio.play();
            swing2_audio.currentTime = 0;
            toggleAnimation(upper, 'attack', 0.5);

            if (checkHit())
                skelLifeDown();

            attack_ready = false;
            setTimeout(function () { attack_ready = true }, HIT_SPEED_PLAYER);
        }
    }
})();

function updateMob()
{
    if (pause_game)
        return;

    var y               = Number(    mob.getAttribute('data-y'      )        ),
        x               = Number(    mob.getAttribute('data-x'      )        ),
        player_x        = Number( player.getAttribute('data-x'      )        ),
        player_facing_r = Boolean(player.getAttribute('data-facingr')=='true'),
        sx              = 0,
        scale           = 1;

    var mob_pos    = relMobPosX(),
        player_pos = relCharacterPosX(),
        diff       = (player_pos-mob_pos);

    if (diff < (-HIT_RANGE) || diff > (+HIT_RANGE))
    {
        sx         = diff>0 ? 0.8 : -0.8;
        x          = x > max_x ? max_x : x+sx;
        x          = x < min_x ? min_x : x;
        down_skel.classList.add('animate_walk_skel');
    }
    else
        down_skel.classList.remove('animate_walk_skel');

    mob.setAttribute('data-x', x);
    mob.setAttribute('data-y', y);
    mob.setAttribute('data-facingr', player_pos>mob_pos);
    mob.style.transform = "translate(" + (player_pos>mob_pos ? x : x-50) + "px, " + y + "px) scale(" + (player_pos>mob_pos ? 1 : -1) + ",1)";
}

function attack_skel_interval()
{
    if (pause_game)
    {
        setTimeout(attack_skel_interval, 400);
        return;
    }

    var player_x = Number(player.getAttribute('data-x'     )),
        player_y = Number(player.getAttribute('data-jump_y')),
        y        = Number(   mob.getAttribute('data-y'     )),
        x        = Number(   mob.getAttribute('data-x'     ));

    if (checkHit())
    {
        setTimeout(function()  {
            swing1_audio.play();
            swing1_audio.currentTime = 0;
            toggleAnimation(upper_skel, 'attack_skel', 0.5);

            player_x = Number(player.getAttribute('data-x'     )),
            player_y = Number(player.getAttribute('data-jump_y')),
            y        = Number(   mob.getAttribute('data-y'     )),
            x        = Number(   mob.getAttribute('data-x'     ));

            if (checkHit())
                playerLifeDown();

        }, HIT_RETARD_SKEL);
        setTimeout(attack_skel_interval, HIT_SPEED_SKEL);
    }
    else
        setTimeout(attack_skel_interval, 400);
};

function checkHit()
{
    var player_y   = Number(player.getAttribute('data-jump_y')),
        mob_pos    = relMobPosX(),
        player_pos = relCharacterPosX(),
        diff       = (player_pos-mob_pos);

    return Math.abs(diff) < HIT_RANGE &&  player_y < 100;
}

function playerLifeDown()
{
    --player_lifes;
    if (player_lifes==5)
        heart1.style.backgroundPosition = "-104px 0px";

    else if (player_lifes==4)
        heart1.style.backgroundPosition = "-208px 0px";

    else if (player_lifes==3)
        heart2.style.backgroundPosition = "-104px 0px";

    else if (player_lifes==2)
        heart2.style.backgroundPosition = "-208px 0px";

    else if (player_lifes==1)
        heart3.style.backgroundPosition = "-104px 0px";

    else if (player_lifes==0)
    {
        resetGame();
        counter_skel.textContent = ++skel_wins;
    }
}

function skelLifeDown()
{
    --skel_lifes;
    if (skel_lifes==5)
        heart4.style.backgroundPosition = "-104px 0px";

    else if (skel_lifes==4)
        heart4.style.backgroundPosition = "-208px 0px";

    else if (skel_lifes==3)
        heart5.style.backgroundPosition = "-104px 0px";

    else if (skel_lifes==2)
        heart5.style.backgroundPosition = "-208px 0px";

    else if (skel_lifes==1)
        heart6.style.backgroundPosition = "-104px 0px";

    else if (skel_lifes==0)
    {
        resetGame();
        counter_player.textContent = ++player_wins;
    }
}

function toggleAnimation(element, animation_class, animation_duration)
{
    element.classList.remove(animation_class);
    setTimeout(function() { element.classList.add(animation_class); }, 10);
    setTimeout(function() { element.classList.remove(animation_class); }, (10+animation_duration*1000));
}

function toggleOptions()
{
    if (pause_game)
    {
        toggleAnimation(document.getElementById('gear'), 'move_gear_left', 1);
        document.getElementById('info').style.display='none';
    }
    else
    {
        toggleAnimation(document.getElementById('gear'), 'move_gear_right', 1);
        document.getElementById('info').style.display='block';
    }

    pause_game=!pause_game;
}

function toggleSound(element)
{
    if (main_audio.paused)
    {
        element.src='resources/sound.png';
        main_audio.play();
    }
    else
    {
        element.src='resources/no_sound.png';
        main_audio.pause();
    }
}

function startGame()
{
    pause_game = false;
    document.getElementById('instructions1').classList.add('slide_left');
    document.getElementById('instructions2').classList.add('slide_right');
    setTimeout( function () {
        document.getElementById('instructions1').style.display = 'none';
        document.getElementById('instructions2').style.display = 'none';
        document.getElementById('instructions' ).style.display = 'none';
    }, 1000);
}

function resize()
{
    var half = (window.innerWidth/2),
        top  = flag_canvas.getBoundingClientRect().top+window.scrollY;

    flag_canvas.width   = flag_canvas_w  = Math.min(window.innerWidth*0.9,1400);
    flag_canvas.height  = flag_canvas_h  = CLOTH_SY*STICKS_SIZE*1.4;
    fire2_canvas.width  = fire2_canvas_w = fire1_canvas.width  = fire1_canvas_w = 200;
    fire2_canvas.height = fire2_canvas_h = fire1_canvas.height = fire1_canvas_h = 400;

    torch_left.style.marginTop   = (top-20) +"px";
    torch_right.style.marginTop  = torch_left.style.marginTop;
    torch_left.style.marginLeft  = (half-500)+"px";
    torch_right.style.marginLeft = (half+290)+"px";

    counter_player.style.marginTop  =  flag_canvas.getBoundingClientRect().bottom+"px";
    counter_skel.style.marginTop    =  flag_canvas.getBoundingClientRect().bottom+"px";
    counter_player.style.marginLeft = (flag_canvas.getBoundingClientRect().right+half+340)/2+"px";
    counter_skel.style.marginLeft   = (flag_canvas.getBoundingClientRect().left +half-550)/2+"px";

    var old_cloth_x = cloth_x;
    var old_cloth_y = cloth_y;

    background_gradient = flag_context.createRadialGradient(flag_canvas_w/2,flag_canvas_h/2,300,flag_canvas_w/2,flag_canvas_h/2,800);
    background_gradient.addColorStop(0,"#000000");
    background_gradient.addColorStop(1,"#202020");

    cloth_x = flag_canvas_w/2 - CLOTH_SX*STICKS_SIZE/2;
    cloth_y = 10;
    max_x = half+SCENARIO_SIZE,
    min_x = half-SCENARIO_SIZE-50;

    if (old_cloth_x !== undefined && old_cloth_y !== undefined)
    {
        var diff_x = cloth_x-old_cloth_x;
        var diff_y = cloth_y-old_cloth_y;
        points.forEach(function (e) {
            e.x    += diff_x;
            e.y    += diff_y;
            e.oldx += diff_x;
            e.oldy += diff_y;
        });
    }

    mob.setAttribute('data-y', flag_canvas_h+top-130);
    mob.setAttribute('data-x', min_x);
    mob.setAttribute('data-facingr', false);

    player.setAttribute('data-y'      , flag_canvas_h+top-130);
    player.setAttribute('data-x'      , half);
    player.setAttribute('data-jump_y' , 0);
    player.setAttribute('data-speed_y', 0);
    player.setAttribute('data-speed_x', 0);
    player.setAttribute('data-facingr', false);
    player.setAttribute('data-accel_y', -0.1);

    player.style.transform = "translate(" + half  + "px, " + (flag_canvas_h+top-130) + "px)";
    mob.style.transform    = "translate(" + min_x + "px, " + (flag_canvas_h+top-130) + "px)";
};

function resetCloth()
{
    if (clothID!==undefined)
        clearInterval(clothID);

    points  = [];
    sticks  = [];
    squares = [];

    createPoints();
    createSticks();
    createSquares();
}

function resetGame()
{
    resize();
    resetCloth();
    player_lifes=6;
    skel_lifes=6;
    heart1.style.backgroundPosition = "0px 0px";
    heart2.style.backgroundPosition = "0px 0px";
    heart3.style.backgroundPosition = "0px 0px";
    heart4.style.backgroundPosition = "0px 0px";
    heart5.style.backgroundPosition = "0px 0px";
    heart6.style.backgroundPosition = "0px 0px";
}

document.onload = function ()
{
    swing1_audio = new Audio('resources/swing1.mp3');
    swing2_audio = new Audio('resources/swing2.mp3');
    main_audio   = new Audio('resources/SearchTheWorld.mp3');
    main_audio.loop = true;

    skel_wins   = 0;
    player_wins = 0;

    fps_time  = 0;
    fps_last_time = 0;
    fps_count = 0;

    pause_game = true;

    flag_canvas  = document.getElementById('flag_canvas');
    fire1_canvas = document.getElementById('fire1_canvas');
    fire2_canvas = document.getElementById('fire2_canvas');

    flag_context  =  flag_canvas.getContext('2d');
    fire1_context = fire1_canvas.getContext('2d');
    fire2_context = fire2_canvas.getContext('2d');

     flag_context.imageSmoothingEnabled = false;
    fire1_context.imageSmoothingEnabled = false;
    fire2_context.imageSmoothingEnabled = false;
    flag_context.lineWidth  = 2;

    window.onresize = resize;

    for (var i=0; i<256; ++i)
        keyMap[i] = false;

    resize();
    resetGame();
    addListerners();

    setInterval(updateGameState      , 20               );
    setInterval(updateClothSimulation, 1000/FPS         );
    setInterval(updateFireSimulation , 1000/UPDATE_SPEED);

    attack_skel_interval();

    document.getElementById('load').style.display = 'none';
    main_audio.play();
}

/* EVENTS */
function addListerners()
{
    flag_canvas.addEventListener('mousemove', function (event)
    {
        var rect = flag_canvas.getBoundingClientRect();
        mousePos.x    = event.clientX - rect.left;
        mousePos.y    = event.clientY - rect.top ;
        mousePos.movx = Math.abs(event.movementX)*0.3;
        mousePos.movy = Math.abs(event.movementY)*0.3;
    });

    flag_canvas.addEventListener('mousedown', function (event)
    {
        if (event.button==0) mousePos.force_multiplier = MULT_FORCE;
    });

    flag_canvas.addEventListener('mouseup', function (event)
    {
        if (event.button==0) mousePos.force_multiplier = MOUSE_FORCE;
    });

    window.addEventListener('keydown', function(e)
    {
        e = e || event;
        keyMap[e.keyCode] = true;
        if (keyMap[32] && e.target == document.body)
            e.preventDefault();
    });

    window.addEventListener('keyup', function(e)
    {
        e = e || event;
        keyMap[e.keyCode] = false;
    });
}

var img_r= [
127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,127,127,127,127,121,121,121,121,121,127,121,127,127,127,127,127,127,127,127,127,127,121,121,121,127,127,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,127,127,127,127,127,127,121,121,127,127,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,121,127,127,121,121,121,121,127,121,121,121,121,127,127,27,27,27,27,27,27,98,41,92,121,121,121,121,127,121,127,121,121,121,121,121,121,127,127,127,127,127,127,127,27,27,27,82,75,66,74,55,83,83,41,83,121,121,121,127,121,121,127,127,121,121,127,127,127,127,127,127,127,27,27,27,82,75,66,74,55,45,11,73,73,73,52,127,121,121,121,127,121,127,127,121,127,127,127,127,162,162,162,162,162,82,75,66,74,55,45,11,11,11,127,127,127,52,127,127,127,121,127,121,121,127,121,121,127,127,127,127,127,162,162,162,150,134,74,55,11,11,11,127,127,121,127,127,52,127,127,127,121,121,127,121,121,121,121,127,127,127,127,127,127,99,150,150,150,134,11,121,121,121,127,121,121,121,127,52,127,127,127,121,121,121,121,121,121,121,121,127,127,127,127,127,99,75,53,134,127,127,121,121,127,127,121,121,121,127,52,127,127,127,121,121,121,121,121,127,121,121,127,127,127,127,127,99,75,53,127,127,127,121,121,127,127,121,121,121,127,52,127,127,127,127,121,121,121,121,127,121,121,127,127,162,127,127,99,75,53,127,127,127,121,121,121,121,121,121,127,127,52,127,127,127,121,121,121,121,121,121,127,121,121,127,127,162,162,99,75,53,127,127,121,121,121,121,121,121,121,127,127,52,127,127,127,121,121,121,127,121,121,121,121,121,127,127,127,162,162,150,53,127,127,121,121,121,121,121,121,121,127,127,52,127,127,121,121,121,121,121,121,121,121,121,121,121,127,127,127,162,162,150,134,127,127,121,121,121,121,121,121,127,127,52,127,127,121,121,127,121,121,121,121,121,121,121,121,121,127,127,127,162,150,150,127,127,121,121,121,121,121,121,127,127,52,127,121,121,121,127,121,121,121,121,121,121,121,121,121,121,127,127,27,82,134,134,127,127,121,121,121,121,127,127,127,52,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,127,27,75,74,11,127,121,121,121,121,127,127,127,52,127,121,121,121,121,121,121,121,121,127,121,121,121,121,121,121,121,127,127,27,66,55,11,121,121,121,121,127,127,127,52,121,121,121,121,121,121,121,121,121,127,127,121,121,121,121,121,121,127,127,27,82,74,11,127,121,121,121,127,127,127,52,127,127,121,121,121,121,121,121,121,127,127,127,121,121,121,121,121,121,127,127,27,75,55,11,127,127,121,121,127,127,52,127,121,121,121,121,121,127,121,121,127,127,127,121,121,121,121,121,121,121,127,127,27,66,45,11,127,127,121,127,127,52,127,121,127,121,121,121,127,121,121,127,127,127,121,127,121,121,121,121,121,121,127,27,82,74,11,127,127,121,127,127,52,127,121,121,121,121,121,127,121,121,127,127,121,121,127,121,121,121,121,121,127,121,127,27,75,55,11,127,127,127,127,52,127,121,121,121,121,121,127,121,121,127,127,121,121,121,121,121,121,121,121,121,127,121,127,27,66,45,11,127,127,127,52,127,121,121,121,121,121,121,121,121,127,127,121,121,121,121,121,121,121,121,121,121,127,121,127,27,74,11,127,127,127,52,127,127,121,127,121,121,121,121,121,127,121,121,121,121,121,121,121,121,121,121,121,121,127,121,127,27,55,73,127,127,52,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,121,127,27,83,73,127,52,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,121,121,121,121,121,121,121,127,127,127,98,83,73,52,127,127,121,121,121,121,121,127,121,121,121,121,121,121,121,127,121,121,121,121,121,121,121,121,121,127,127,127,41,41,52,127,127,121,121,121,121,121,127,121,121,127,121,121,121,121,121,121,121,121,121,127,121,121,121,121,121,121,127,98,92,83,127,127,121,121,127,121,121,121,121,121,127,127,127,121,121,121,121,121,121,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,127,127,127,127,121,121,121,127,127,127,127,121,121,121,121,121,127,127,127,121,121,121,121,121,127
];

var img_g= [
127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,127,127,127,127,121,121,121,121,121,127,121,127,127,127,127,127,127,127,127,127,127,121,121,121,127,127,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,127,127,127,127,127,127,121,121,127,127,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,121,127,127,121,121,121,121,127,121,121,121,121,127,127,29,29,29,29,29,29,92,41,87,121,121,121,121,127,121,127,121,121,121,121,121,121,127,127,127,127,127,127,127,29,29,29,58,52,44,52,38,78,78,41,78,121,121,121,127,121,121,127,127,121,121,127,127,127,127,127,127,127,29,29,29,58,52,44,52,38,30,13,68,68,68,52,127,121,121,121,127,121,127,127,121,127,127,127,127,178,178,178,178,178,58,52,44,52,38,30,13,13,13,127,127,127,52,127,127,127,121,127,121,121,127,121,121,127,127,127,127,127,178,178,178,161,143,52,38,13,13,13,127,127,121,127,127,52,127,127,127,121,121,127,121,121,121,121,127,127,127,127,127,127,93,161,161,161,143,13,121,121,121,127,121,121,121,127,52,127,127,127,121,121,121,121,121,121,121,121,127,127,127,127,127,93,74,51,143,127,127,121,121,127,127,121,121,121,127,52,127,127,127,121,121,121,121,121,127,121,121,127,127,127,127,127,93,74,51,127,127,127,121,121,127,127,121,121,121,127,52,127,127,127,127,121,121,121,121,127,121,121,127,127,178,127,127,93,74,51,127,127,127,121,121,121,121,121,121,127,127,52,127,127,127,121,121,121,121,121,121,127,121,121,127,127,178,178,93,74,51,127,127,121,121,121,121,121,121,121,127,127,52,127,127,127,121,121,121,127,121,121,121,121,121,127,127,127,178,178,161,51,127,127,121,121,121,121,121,121,121,127,127,52,127,127,121,121,121,121,121,121,121,121,121,121,121,127,127,127,178,178,161,143,127,127,121,121,121,121,121,121,127,127,52,127,127,121,121,127,121,121,121,121,121,121,121,121,121,127,127,127,178,161,161,127,127,121,121,121,121,121,121,127,127,52,127,121,121,121,127,121,121,121,121,121,121,121,121,121,121,127,127,29,58,143,143,127,127,121,121,121,121,127,127,127,52,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,127,29,52,52,13,127,121,121,121,121,127,127,127,52,127,121,121,121,121,121,121,121,121,127,121,121,121,121,121,121,121,127,127,29,44,38,13,121,121,121,121,127,127,127,52,121,121,121,121,121,121,121,121,121,127,127,121,121,121,121,121,121,127,127,29,58,52,13,127,121,121,121,127,127,127,52,127,127,121,121,121,121,121,121,121,127,127,127,121,121,121,121,121,121,127,127,29,52,38,13,127,127,121,121,127,127,52,127,121,121,121,121,121,127,121,121,127,127,127,121,121,121,121,121,121,121,127,127,29,44,30,13,127,127,121,127,127,52,127,121,127,121,121,121,127,121,121,127,127,127,121,127,121,121,121,121,121,121,127,29,58,52,13,127,127,121,127,127,52,127,121,121,121,121,121,127,121,121,127,127,121,121,127,121,121,121,121,121,127,121,127,29,52,38,13,127,127,127,127,52,127,121,121,121,121,121,127,121,121,127,127,121,121,121,121,121,121,121,121,121,127,121,127,29,44,30,13,127,127,127,52,127,121,121,121,121,121,121,121,121,127,127,121,121,121,121,121,121,121,121,121,121,127,121,127,29,52,13,127,127,127,52,127,127,121,127,121,121,121,121,121,127,121,121,121,121,121,121,121,121,121,121,121,121,127,121,127,29,38,68,127,127,52,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,121,127,29,78,68,127,52,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,121,121,121,121,121,121,121,127,127,127,92,78,68,52,127,127,121,121,121,121,121,127,121,121,121,121,121,121,121,127,121,121,121,121,121,121,121,121,121,127,127,127,41,41,52,127,127,121,121,121,121,121,127,121,121,127,121,121,121,121,121,121,121,121,121,127,121,121,121,121,121,121,127,92,87,78,127,127,121,121,127,121,121,121,121,121,127,127,127,121,121,121,121,121,121,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,127,127,127,127,121,121,121,127,127,127,127,121,121,121,121,121,127,127,127,121,121,121,121,121,127
];

var img_b= [
127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,127,127,127,127,121,121,121,121,121,127,121,127,127,127,127,127,127,127,127,127,127,121,121,121,127,127,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,127,127,127,127,127,127,121,121,127,127,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,121,127,127,121,121,121,121,127,121,121,121,121,127,127,25,25,25,25,25,25,74,26,70,121,121,121,121,127,121,127,121,121,121,121,121,121,127,127,127,127,127,127,127,25,25,25,31,26,20,28,18,62,62,26,62,121,121,121,127,121,121,127,127,121,121,127,127,127,127,127,127,127,25,25,25,31,26,20,28,18,14,15,54,54,54,32,127,121,121,121,127,121,127,127,121,127,127,127,127,181,181,181,181,181,31,26,20,28,18,14,15,15,15,127,127,127,32,127,127,127,121,127,121,121,127,121,121,127,127,127,127,127,181,181,181,163,144,28,18,15,15,15,127,127,121,127,127,32,127,127,127,121,121,127,121,121,121,121,127,127,127,127,127,127,68,163,163,163,144,15,121,121,121,127,121,121,121,127,32,127,127,127,121,121,121,121,121,121,121,121,127,127,127,127,127,68,55,42,144,127,127,121,121,127,127,121,121,121,127,32,127,127,127,121,121,121,121,121,127,121,121,127,127,127,127,127,68,55,42,127,127,127,121,121,127,127,121,121,121,127,32,127,127,127,127,121,121,121,121,127,121,121,127,127,181,127,127,68,55,42,127,127,127,121,121,121,121,121,121,127,127,32,127,127,127,121,121,121,121,121,121,127,121,121,127,127,181,181,68,55,42,127,127,121,121,121,121,121,121,121,127,127,32,127,127,127,121,121,121,127,121,121,121,121,121,127,127,127,181,181,163,42,127,127,121,121,121,121,121,121,121,127,127,32,127,127,121,121,121,121,121,121,121,121,121,121,121,127,127,127,181,181,163,144,127,127,121,121,121,121,121,121,127,127,32,127,127,121,121,127,121,121,121,121,121,121,121,121,121,127,127,127,181,163,163,127,127,121,121,121,121,121,121,127,127,32,127,121,121,121,127,121,121,121,121,121,121,121,121,121,121,127,127,25,31,144,144,127,127,121,121,121,121,127,127,127,32,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,127,25,26,28,15,127,121,121,121,121,127,127,127,32,127,121,121,121,121,121,121,121,121,127,121,121,121,121,121,121,121,127,127,25,20,18,15,121,121,121,121,127,127,127,32,121,121,121,121,121,121,121,121,121,127,127,121,121,121,121,121,121,127,127,25,31,28,15,127,121,121,121,127,127,127,32,127,127,121,121,121,121,121,121,121,127,127,127,121,121,121,121,121,121,127,127,25,26,18,15,127,127,121,121,127,127,32,127,121,121,121,121,121,127,121,121,127,127,127,121,121,121,121,121,121,121,127,127,25,20,14,15,127,127,121,127,127,32,127,121,127,121,121,121,127,121,121,127,127,127,121,127,121,121,121,121,121,121,127,25,31,28,15,127,127,121,127,127,32,127,121,121,121,121,121,127,121,121,127,127,121,121,127,121,121,121,121,121,127,121,127,25,26,18,15,127,127,127,127,32,127,121,121,121,121,121,127,121,121,127,127,121,121,121,121,121,121,121,121,121,127,121,127,25,20,14,15,127,127,127,32,127,121,121,121,121,121,121,121,121,127,127,121,121,121,121,121,121,121,121,121,121,127,121,127,25,28,15,127,127,127,32,127,127,121,127,121,121,121,121,121,127,121,121,121,121,121,121,121,121,121,121,121,121,127,121,127,25,18,54,127,127,32,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,121,127,25,62,54,127,32,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,121,127,121,121,121,121,121,121,121,127,127,127,74,62,54,32,127,127,121,121,121,121,121,127,121,121,121,121,121,121,121,127,121,121,121,121,121,121,121,121,121,127,127,127,26,26,32,127,127,121,121,121,121,121,127,121,121,127,121,121,121,121,121,121,121,121,121,127,121,121,121,121,121,121,127,74,70,62,127,127,121,121,127,121,121,121,121,121,127,127,127,121,121,121,121,121,121,127,127,121,121,121,121,121,121,121,121,121,121,121,121,121,127,127,127,127,121,121,121,127,127,127,127,121,121,121,121,121,127,127,127,121,121,121,121,121,127
];
