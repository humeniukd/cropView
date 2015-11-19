define(['jquery', 'config'], function($){
    var $wheel = $('#wheel'), networkErrorShowed = false,
        $alert = $('.alert'),
        WIDTH = EVENTPICS_WIDTH, HEIGHT = EVENTPICS_HEIGHT,
        MAXWIDTH = WIDTH*2,
        MAXHEIGHT = HEIGHT*2,
        doImgResize = function(img, width, height){
            var base64,
                canvas = document.createElement('canvas'),
                ctx = canvas.getContext('2d');

            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);

            base64 = canvas.toDataURL("image/png");
            return base64;
        },
        doImgRotate = function(img, angle){
            if('undefined' === typeof angle) angle = 90;
            var base64,
                canvas = document.createElement('canvas'),
                isRight = angle/90%2,
                origWidth = img.width, origHeight = img.height,
                ctx = canvas.getContext('2d'),
                width = isRight ? origHeight : origWidth,
                height = isRight ? origWidth : origHeight;

            canvas.width = width;
            canvas.height = height;

            ctx.translate(width/2, height/2);

            ctx.rotate(angle*Math.PI/180);

            ctx.drawImage(img, -origWidth/2, -origHeight/2, origWidth, origHeight);

            base64 = canvas.toDataURL("image/png");
            return base64;
        },
        getImgFitRatio = function(img){
            var height = img.height,
                width = img.width,
                k = 1, xK, yK,
                smallerSide = Math.min(height, width);

            if(width > MAXWIDTH || height > MAXHEIGHT){
                xK = MAXWIDTH / width;
                yK = MAXHEIGHT / height;
                k = smallerSide === width ? yK : xK;
                width *= k;
                height *= k;
            }

            if(width < WIDTH || height < HEIGHT) {
                xK = WIDTH / width;
                yK = HEIGHT / height;
                k *= smallerSide === width ? xK : yK;
            }
            return k;
        };
    return {
        prettyDate: function(timestamp) {
            var fromSeconds = timestamp;
            var toSeconds = new Date().getTime()/1000;
            var distanceInSeconds = Math.round(Math.abs(fromSeconds - toSeconds));
            var distanceInMinutes = Math.round(distanceInSeconds / 60);
            return (distanceInMinutes < 45 && distanceInMinutes + " minutes" || distanceInMinutes < 90 && "about 1 hour" || distanceInMinutes < 1440 && "about " + (Math.round(distanceInMinutes / 60)) + " hours" || distanceInMinutes < 2880 && "1 day" || distanceInMinutes < 43200 && (Math.round(distanceInMinutes / 1440)) + " days" || distanceInMinutes < 86400 && "about 1 month" || distanceInMinutes < 525600 && (Math.round(distanceInMinutes / 43200)) + " months" || distanceInMinutes < 1051200 && "about 1 year" || "over " + (Math.round(distanceInMinutes / 525600)) + " years");
        },
        percent: function ( num, base ) {
            if (base==0)
                return 0;
            else
                return Math.round(num/base*100);
        },
        dontmove: function (e) {
            e.preventDefault();
        },
        notify: function(text){
            this.alert(text, 'alert__success');
        },
        error: function(text){
            this.alert(text, 'alert__error');
        },
        warn: function(text){
            this.alert(text, 'alert__warn');
        },
        alert: function(text, type) {
            var alertHide = function() {
                $alert.html();
                $alert.hide();
                if(type)
                    $alert.removeClass(type);
            };

            $alert.html(text);
            if(type)
                $alert.addClass(type);
            $alert.show();

            $alert.on('click', function() {
              alertHide()
            });
            setTimeout(function() {
                alertHide();
            }, 4000);
        },
        getCoords: function (elem) {
            var box = elem.getBoundingClientRect();

            var body = document.body;
            var docElem = document.documentElement;

            var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
            var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;

            var clientTop = docElem.clientTop || body.clientTop || 0;
            var clientLeft = docElem.clientLeft || body.clientLeft || 0;

            var top  = box.top +  scrollTop - clientTop;
            var left = box.left + scrollLeft - clientLeft;

            return { top: Math.round(top), left: Math.round(left) };
        },
        getXY: function (obj,e) {
            var xy=[];
            var coords = this.getCoords(obj);
            if (e.pageX) {
                xy[0] = e.pageX - coords.left;
                xy[1] = e.pageY - coords.top;
            } else {
                var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
                xy[0] = touch.pageX - coords.left;
                xy[1] = touch.pageY - coords.top;
            }
            return xy;
        },
        showWheel:  function() {
            $wheel.modal('show');
        },
        hideWheel: function () {
            $wheel.modal('hide');
        },
        getInterval: function (interval) {
            var from, to;
            from = new Date();
            from.setHours(0,0,0,0);
            to = new Date();
            to.setHours(0,0,0,0);
            switch (interval) {
                case 1:
                    while (to.getDay() !== 0)
                        to.setTime(to.getTime() - 24*60*60*1000);
                    from.setTime(to.getTime()-7*24*60*60*1000);
                    break;
                case 2:
                    while (from.getDay() !== 6)
                        from.setTime(from.getTime() - 24*60*60*1000);
                    to.setTime(from.getTime()+2*24*60*60*1000);
                    break;
                case 3:
                    from.setTime(from.getTime() - 24*60*60*1000);
                    break;
                case 4:
                    to = new Date();
                    break;
                case 5:
                    to = new Date();
                    from.setTime(to.getTime() - 3*3600*1000);
                    break;
                case 6:
                    to = new Date();
                    from.setTime(to.getTime() - 3600*1000);
                    break;
                default:
                    return;
            }
            return {
                from: from,
                to: to
            }
        },
        getWeeks: function (from, to) {
            return Math.floor((to - from)/(1000*60*60*24*7));
        },
        compareByTimeStamp: function (a, b) {
            if (a.time_stamp < b.time_stamp)
                return 1;
            if (a.time_stamp > b.time_stamp)
                return -1;
            return 0;
        },
        colorValues: function (chartValues, templates){
            return $.map(templates, function(template, i){
                return $.extend({}, template, {value: chartValues[i+1]});
            });
        },
        showNetworkError: function(){
            if(!networkErrorShowed) {
                this.error('Network error!');
                networkErrorShowed = true;
                setTimeout(function () {
                    networkErrorShowed = false
                }, 4000);
            }
        },
        doImgResize: doImgResize,
        getImgFitRatio: getImgFitRatio,
        doImgRotate: doImgRotate
    }
});