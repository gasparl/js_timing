/*jshint esversion: 6 */

// define global variables
let use_images, date_time, listenkey, text_to_show, js_times,
    bg_color, stim_color, input_time, disp_func, canvas, ctx;
let trialnum = 0,
    startclicked = false,
    allimages = [],
    misc = {}; // advance time with which at which to stop display

document.addEventListener("DOMContentLoaded", function() {
    // define a small information box for continually updated info about the ongoing trials
    let heads = ["os", "os_v", "browser", "browser_v", "screen"];
    let cols = [jscd.os, jscd.osVersion, jscd.browser, jscd.browserVersion, jscd.screen];
    let jscd_show = heads.map(function(hed, ind) {
        misc[hed] = cols[ind];
        return ('<br>' + hed + ': <b>' + cols[ind] + '</b>');
    });

    date_time = neat_date();
    document.getElementById('jscd_id').innerHTML = jscd_show;

    // define the canvas on which to draw the main stimuli
    canvas = document.getElementById('canvas_id');
    ctx = canvas.getContext('2d', {
        desynchronized: true
    });

    // listen to relevant keypresses
    document.body.addEventListener('keydown', function(e) {
        // input_time (for "q" keypress) is the JS-timed keypress in the manuscript
        // the main measure is the time between this and the stimulus display time (below)
        input_time = performance.now();

        // on pressing "q", immediately display next stimulus
        // (pressing "x" is simply the indication of starting the experiment)
        if (listenkey && e.key == 'q') {
            listenkey = false;
            disp_func(); // here the stimulus is displayed
        } else if (startclicked && e.key == 'x') {
            misc.xstart = input_time;
            next_trial(); // initiates trial cycles
            startclicked = false;
        }
    });
});

// condition selection based on the clicked button (see index.html)
// (background: white or black; stimuli: plain text/canvas [study 1] or images [study 2])
const begin = function(colr, imguse) {
    bg_color = colr;
    use_images = imguse;
    if (use_images) {
        misc.study = '/image/';
    } else {
        misc.study = '/plain/';
    }
    // (stimulus color always opposite of background color)
    if (bg_color == 'black') {
        stim_color = 'white'; // text stimulus color
        document.getElementById('stimulus_id').style.color = "white";
        ctx.fillStyle = "white"; // canvas stimulus color
        document.getElementById('bg_id').style.backgroundColor = "black";
        misc.bg = 'black/';
    } else {
        stim_color = 'black';
        misc.bg = 'white/';
        document.getElementById('bg_id').style.backgroundColor = "white";
    }
    document.getElementById('btns_id').style.visibility = 'hidden';
    stim_gen();
    startclicked = true;
};

// create a list of dictionaries
// where each dictionary contains the information of a single trial
const stim_gen = function() {
    const times = 10; // how many repetitions per condition
    const durs = [(50 / 3), 50, 150, 300, 500]; // variations of stimulus display duration
    const buffs = [0, 2.5, 5]; // variations of buffer time
    let methods;
    if (use_images === true) {
        methods = [
            'canvas', 'opacity', 'visibility', 'display'
        ];
    } else {
        methods = [
            'rAF_single', 'rAF_double', 'rAF_loop'
        ];
    }
    let types = {};
    if (use_images === true) {
        const imgtypes = {
            'img_tiny': 'png',
            'img_small': 'jpg',
            'img_medium': 'bmp',
            'img_large': 'bmp'
        };
        Object.keys(imgtypes).forEach((img_x) => {
            types[img_x] = Array(10).fill(0).map(function(x, y) {
                let fnam = './images/' + img_x + y + '_' + stim_color + '.' + imgtypes[img_x];
                allimages.push(fnam);
                return (fnam);
            });
        });
        DT.addCanvas('canvas_id');
        DT.preload(allimages)
            .then(function(images) {
                for (let ikey in DT.images) {
                    DT.images[ikey].style.visibility = 'hidden';
                    DT.images[ikey].style.opacity = 0;
                    document.getElementById('stimulus_id').appendChild(DT.images[ikey]);
                }
                console.log('Preloaded all', images);
                checkLoad();
            })
            .catch(function(err) {
                console.error('Failed', err);
            });
    } else {
        types = {
            'text': Array(times).fill('■'),
            'img_canvas': Array(times).fill('_')
        };
        document.getElementById('bg_id').style.border = "solid 3px blue";
    }

    // to get the full list of trial dictionaries, assign all condition combinations
    allstims = [];
    methods.forEach((tmr) => {
        durs.forEach((dur) => {
            buffs.forEach((buf) => {
                Object.keys(types).forEach((typ) => {
                    let stims = shuffle(types[typ]).slice(0, times);
                    stims.forEach((itm) => {
                        allstims.push({
                            'item': itm,
                            'duration': dur,
                            'buff': buf,
                            'type': typ,
                            'method': tmr
                        });
                    });
                });
            });
        });
    });
    // shuffle the list to get random order
    allstims = shuffle(allstims);
};

// check if a specific image is loaded
const loaded = function(img) {
    if (!img.complete) {
        return false;
    }
    if (typeof img.naturalWidth != "undefined" && img.naturalWidth == 0) {
        return false;
    }
    return true;
};

// check if all images are loaded
const checkLoad = function() {
    for (let ikey in DT.images) {
        if (!loaded(DT.images[ikey])) {
            alert('Failed image completion!');
            console.log('Failed completion');
            return false;
        }
    }
    console.log('All images complete');
    // indicate complication via changing rectangle border to blue
    document.getElementById('bg_id').style.border = "solid 3px blue";
};

const next_trial = function() {
    // prepare next trial
    trialnum++;
    js_times = {};
    current_stim = allstims.shift(); // get next stimulus dictionary
    console.log(current_stim); // print info
    // display updated trial information
    document.getElementById('info_id').innerHTML =
        'Current trial: <b>' + trialnum + '</b> (' + allstims.length +
        ' left)<br>Item: <b>' + current_stim.item +
        '</b><br>Type: <b>' + current_stim.type +
        '</b><br>Duration: <b>' + current_stim.duration +
        '</b><br>Method: <b>' + current_stim.method +
        '</b><br>Background: <b>' + bg_color + '</b>';
    DT.loopOff(); // make sure RAF loop is turned off
    if (use_images == true) {
        // prepare image if necessary (i.e., in case of Study 2)
        document.getElementById('stimulus_id').style.visibility = 'hidden';
        DT.images[current_stim.item].style.visibility = 'visible';
        DT.images[current_stim.item].style.opacity = 1;
        if (current_stim.method != 'canvas') {
            if (current_stim.method == 'none') {
                DT.images[current_stim.item].style.visibility = 'hidden';
            } else {
                DT.images[current_stim.item].style.opacity = 0;
                DT.images[current_stim.item].style.willChange = 'opacity';
            }
            document.getElementById('stimulus_id').appendChild(DT.images[current_stim.item]);
        } else {
            document.getElementById('stimulus_id').innerHTML = '';
        }
    }
    // wait a little before setting conditions
    // (this is just for extra safety)
    setTimeout(function() {
        if (use_images === true) {
            // this simply chooses the image display function
            set_img_conds();
        } else {
            // this chooses the timing method function (no images)
            // (and includes RAF loop when applicable)
            set_disp_conds();
        }
        setTimeout(function() {
            listenkey = true;
        }, 100);
    }, 100);
};

// use image display function
const set_img_conds = function() {
    disp_func = disp_image;
    DT.loopOn();
};

// choose timing method (without images)
const set_disp_conds = function() {
    // here, the given timing method is chosen based on the current method name
    // again, method names correspond to the ones described in https://osf.io/7h5tw/
    // the given method functions are assigned as disp_func, which is then executed
    if (current_stim.method == 'rAF_single') {
        disp_func = disp_rAF1_text;
    } else if (current_stim.method == 'rAF_double') {
        disp_func = disp_rAF2_text;
    } else if (current_stim.method == 'rAF_loop') { // same as rAF_single but with loop
        disp_func = disp_rAF1_text;
        DT.loopOn();
    } else {
        // (just for extra safety; it was useful for pilot testing)
        console.error('No display function found');
        store_trial();
    }
};

//*** display functions ***//

/*
In the functions below, the js_times dictionary collects the crucial JS-timings.
The appearance of the stimulus is indicated with the "start_" prefix.
The disappearance of the stimulus is indicated with the "end_" prefix.
Te timestamped measure is indicated with the "_stamp" suffix.
(This timestamped measure is the main JS timing for all RAF methods in the manuscript!)
The "_nextline" suffix indicates the line immediately after the display command.
The "_other" suffix indicates possible alternatives (mainly: calling now() right before the RAF).

Note that these functions are executed immediately after the "q" keypress detection.
Hence the display command (typically given within a RAF) comes immediately after the keypress.
The main measurement is the time between the keypress JS timing and the display start JS timing.
(Which is compared to the corresponding measurement obtained by the external timer.)
*/


// plain text/canvas display and timing methods
// (see the corresponding method names in the set_disp_conds() function)


const trial_end = function(end_stamp0) {
    js_times.end_0_now = performance.now();
    js_times.end_0 = end_stamp0;
    requestAnimationFrame(function(end_stamp1) {
        js_times.end_1_now = performance.now();
        js_times.end_1 = end_stamp1;
        if (current_stim.type == 'text') {
            document.getElementById('stimulus_id').textContent = '';
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        requestAnimationFrame(function(end_stamp2) {
            js_times.end_2_now = performance.now();
            js_times.end_2 = end_stamp2;
            store_trial();
        });
    });
};

const stopwatch = function() {
    if (current_stim.stopwatch === 'raf') {

    } else {
        setTimeout(() => {
            trial_end();
        }, current_stim.duration - current_stim.buff);
    }
};

const disp_rAF1_text = function() {
    console.log('disp_rAF1_text', neat_date());
    js_times.start_other = performance.now();

    requestAnimationFrame(function(stamp) {
        if (current_stim.type == 'text') {
            document.getElementById('stimulus_id').textContent = current_stim.item;
        } else {
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        js_times.start_nextline = performance.now();
        js_times.start_stamp = stamp; // the crucial (start) JS-timing
        stopwatch();
    });
};


const disp_rAF2_text = function() {
    console.log('disp_rAF2_text', neat_date());
    requestAnimationFrame(function() {
        if (current_stim.type == 'text') {
            document.getElementById('stimulus_id').textContent = current_stim.item;
        } else {
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        js_times.start_nextline = performance.now();
        requestAnimationFrame(function(stamp) {
            js_times.start_other = performance.now();
            js_times.start_stamp = stamp;
            stopwatch();
        });
    });
};


// image display and timing method

const disp_image = function() {
    console.log('disp_image', neat_date());
    js_times.start_other = performance.now();

    requestAnimationFrame(function(stamp) {
        if (current_stim.method == 'canvas') {
            DT.drawCanvas('canvas_id', current_stim.item);
        } else if (current_stim.method == 'none') {
            DT.images[current_stim.item].style.visibility = 'visible';
        } else {
            DT.images[current_stim.item].style.opacity = 1;
        }
        js_times.start_nextline = performance.now();
        js_times.start_stamp = stamp; // the crucial (start) JS-timing

        setTimeout(function() {
            js_times.end_other = performance.now();

            requestAnimationFrame(function(stamp2) {
                if (current_stim.method == 'canvas') {
                    DT.clearCanvas('canvas_id');
                } else if (current_stim.method == 'none') {
                    DT.images[current_stim.item].style.visibility = 'hidden';
                } else {
                    DT.images[current_stim.item].style.opacity = 0;
                }
                js_times.end_nextline = performance.now();
                js_times.end_stamp = stamp2; // the crucial (end) JS-timing
                store_trial();
            });

        }, current_stim.duration - current_stim.buff);

    });
};

//*** storing data, etc. ***//

// column names for the data to be saved
let full_data = [
    "datetime",
    "trial_number",
    "stimulus",
    "type",
    "duration",
    "buffer",
    "method",
    "js_input",
    "js_start_nextline",
    "js_end_nextline",
    "js_start_stamp",
    "js_end_stamp",
    "js_start_other",
    "js_end_other"
].join('\t') + '\n';

const store_trial = function() {
    let c_item;
    c_item = current_stim.item.replace('./images/', '');
    full_data += [
        date_time,
        trialnum,
        c_item,
        current_stim.type,
        current_stim.duration,
        current_stim.buff,
        current_stim.method,
        input_time,
        js_times.start_nextline || 'NA',
        js_times.end_nextline || 'NA',
        js_times.start_stamp || 'NA',
        js_times.end_stamp || 'NA',
        js_times.start_other || 'NA',
        js_times.end_other || 'NA'
    ].join('\t') + '\n';
    input_time = 'NA';
    if (allstims.length > 0) {
        next_trial();
    } else {
        ending();
    }
};

// change rectangle color to blue to indicate experiment ending
const ending = function() {
    console.log('THE END');
    full_data += JSON.stringify(misc);
    document.getElementById('dl_id').style.display = 'block';
    setTimeout(function() {
        document.getElementById('bg_id').style.backgroundColor = "blue";
    }, 5000);
};

// function to download (save) results data as a text file
const dl_as_file = function() {
    let stud;
    if (use_images) {
        stud = 'image_';
    } else {
        stud = 'plain_';
    }
    filename_to_dl = 'disptime_' + stud + jscd.os + '_' +
        jscd.browser + '_' + bg_color + '_' + date_time + '.txt';
    data_to_dl = full_data;
    let blobx = new Blob([data_to_dl], {
        type: 'text/plain'
    });
    let elemx = window.document.createElement('a');
    elemx.href = window.URL.createObjectURL(blobx);
    elemx.download = filename_to_dl;
    document.body.appendChild(elemx);
    elemx.click();
    document.body.removeChild(elemx);
};

// get readable current date and time
const neat_date = function() {
    let m = new Date();
    return m.getFullYear() + "_" +
        ("0" + (m.getMonth() + 1)).slice(-2) + "" +
        ("0" + m.getDate()).slice(-2) + "_" +
        ("0" + m.getHours()).slice(-2) + "" +
        ("0" + m.getMinutes()).slice(-2);
};

// order randomization function
const shuffle = function(arr) {
    let array = JSON.parse(JSON.stringify(arr));
    let newarr = [];
    let currentIndex = array.length,
        temporaryValue,
        randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        newarr[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return newarr;
};
