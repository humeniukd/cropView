define(['underscore', 'jquery', 'backbone', 'utils', 'templates'],
    function(_, $, Backbone, utils, JST){
        var WIDTH = 500, HEIGHT = 500,
            that,
            CropView = Backbone.View.extend({
            // Some variable and settings
            $container: null,
            event_state: {},
            drag: false,
            template: JST['js/templates/cropModal.html'],
            $ovelay: null,
            $crop: null,
            img: null,
            k: 1,
            saveEventState: function (e) {
                var event_state = this.event_state, $container = this.$container;
                // Save the initial event details and container state
                event_state.container_width = $container.width();
                event_state.container_height = $container.height();
                event_state.container_left = $container.offset().left;
                event_state.container_top = $container.offset().top;
                event_state.img_width = this.$img.width();
                event_state.img_height = this.$img.height();
                event_state.crop_width = this.$crop.width();
                event_state.crop_height = this.$crop.height();
                event_state.crop_top = this.$crop.offset().top;
                event_state.crop_left = this.$crop.offset().left;
                event_state.mouse_x = (e.clientX || e.pageX || e.originalEvent.touches[0].clientX) + $(window).scrollLeft();
                event_state.mouse_y = (e.clientY || e.pageY || e.originalEvent.touches[0].clientY) + $(window).scrollTop();

                // This is a fix for mobile safari
                // For some reason it does not allow a direct copy of the touches property
                if (typeof e.originalEvent.touches !== 'undefined') {
                    event_state.touches = [];
                    $.each(e.originalEvent.touches, function (i, ob) {
                        event_state.touches[i] = {};
                        event_state.touches[i].clientX = 0 + ob.clientX;
                        event_state.touches[i].clientY = 0 + ob.clientY;
                    });
                }
                event_state.evnt = e;
            },
            onSave: function(e){
                e.preventDefault();
                this.crop();
                this.$img.parents('.fileinput').attr('data-changed', 'true');
                $('#cropModal').modal('hide');
                if ($('body > .modal').css('display') == 'block') {
                    $('body').addClass('modal-open');
                }
                return false;
            },
            events: {
                'click #cropImgSave': 'onSave',
                'mousedown img': 'startMoving',
                'touchstart img': 'startMoving',
                'hidden.bs.modal': 'remove',
                'click .crop-zoom-plus': function(e){
                    e.preventDefault();
                    if(3 > this.zoomed){
                        this.$container.removeAttr('style');
                        this.resize12x();
                        this.zoomed++;
                    } else {
                        $('.crop-zoom-plus').attr("disabled", 'disabled');
                    }
                    $('.crop-zoom-minus').removeAttr("disabled");
                },
                'click .crop-zoom-minus': function(e){
                    e.preventDefault();
                    this.$container.removeAttr('style');
                    this.resize08x();
                    this.zoomed--;
                    $('.crop-zoom-plus').removeAttr("disabled");
                },
                'click .crop-rotate': function(e){
                    e.preventDefault();
                    this.$container.removeAttr('style');
                    this.rotate();
                }
            },
            zoomed: 0,
            angle: 0,
            loadImg: function (file) {
                var fileReader = new FileReader, that = this,
                    dfd = $.Deferred();
                return fileReader.onload = function(e) {
                        var img = new Image;
                        img.onload = function(){
                            var k = utils.getImgFitRatio(img);
                            if(1 !== k) {
                                var newImg = new Image,
                                    width = img.width*k,
                                    height = img.height*k;
                                newImg.onload = dfd.resolve.bind(that, newImg);
                                newImg.src = utils.doImgResize(img, width, height);
                            } else
                                dfd.resolve(img);
                        },
                        img.src = e.target.result
                    },
                    fileReader.onerror = fileReader.onabort = dfd.reject,
                    fileReader.readAsDataURL(file),
                dfd
            },
            initialize: function (options){
                that = this;
                this.loadImg(options.file).done(function(img){
                    that.img = img;
                    that.$cropImg[0].src = img.src;
                });
                this.$img = options.$img;
            },
            moving: function(e){
                e.preventDefault();
                e.stopPropagation();
                if(that.drag) {
                    var mouse = {}, deltaX, deltaY, posX, posY, posXmin, posYmin,
                        event_state = that.event_state, $container = that.$container,
                        touches = e.originalEvent.touches;

                    mouse.x = (e.clientX || e.pageX || touches[0].clientX) + $(window).scrollLeft();
                    mouse.y = (e.clientY || e.pageY || touches[0].clientY) + $(window).scrollTop();

                    deltaX = mouse.x - event_state.mouse_x;
                    deltaY = mouse.y - event_state.mouse_y;

                    posX = event_state.container_left + deltaX;
                    posY = event_state.container_top + deltaY;

                    posX = posX < event_state.crop_left ? posX : event_state.crop_left;
                    posY = posY < event_state.crop_top ? posY : event_state.crop_top;

                    posXmin = event_state.crop_left - (that.$cropImg[0].offsetWidth - event_state.crop_width);
                    posYmin = event_state.crop_top - (that.$cropImg[0].offsetHeight - event_state.crop_height);

                    posX = posXmin > posX ? posXmin : posX;
                    posY = posYmin > posY ? posYmin : posY;

                    $container.offset({
                        'left': posX,
                        'top': posY
                    });
                }
            },
            endMoving: function(e){
                e.preventDefault();
                that.drag = false;
                that.$document.off('mousemove touchmove', that.moving);
                that.$document.off('mouseup touchend', that.endMoving);
            },
            startMoving: function (e) {
                e.preventDefault();
                e.stopPropagation();
                that.drag = true;
                that.saveEventState(e);
                that.$document.on('mousemove touchmove', that.moving);
                that.$document.on('mouseup touchend', that.endMoving);
            },
            crop: function () {
                //Find the part of the image that is inside the crop box
                var crop_canvas, $container = this.$container,
                    left = this.$overlay.offset().left - $container.offset().left+1,
                    top = this.$overlay.offset().top - $container.offset().top+1;

                crop_canvas = document.createElement('canvas');

                crop_canvas.width = WIDTH;
                crop_canvas.height = HEIGHT;

                crop_canvas.getContext('2d').drawImage(this.img, left/this.k, top/this.k, WIDTH/this.k, HEIGHT/this.k, 0, 0, WIDTH, HEIGHT);
                var base64 = crop_canvas.toDataURL("image/png");
                this.$img.parent().css('background-image', 'url('+base64+')' );
                this.$img.attr('src', base64);
            },
            render: function(){
                this.$el.html(this.template()).appendTo('body');
                this.$container = $('.crop-resize-container');
                this.$cropImg = $('#cropImg');
                this.$crop = $('#crop-iholder');
                this.$cropImgOpacity = $('#cropImg-opacity');
                this.$overlay = $('.overlay');
                this.$container.removeAttr('style');
                this.$document = $(document);
                this.$cropImg.load(function () {
                    that.$cropImgOpacity[0].src = that.$cropImg[0].src;
                });
                return this;
            },
            resizeImage: function () {
                var width = this.img.width*this.k,
                    height = this.img.height*this.k,
                    base64 = utils.doImgResize(this.img, width, height);
                    this.$cropImg.attr('src', base64);
            },
            rotateImage: function () {
                var dfd = $.Deferred(),
                    base64 = utils.doImgRotate(this.img);
                this.img.src = base64;
                this.img.onload = dfd.resolve.bind(this);
                return dfd;
            },
            resize12x: function (){
                this.k *= 1.2;
                this.resizeImage();
            },
            resize08x: function (){
                if (this.$cropImg.width()/1.2 >= EVENTPICS_WIDTH && this.$cropImg.height()/1.2 >= EVENTPICS_HEIGHT) {
                    this.k /= 1.2;
                } else {
                    var w = EVENTPICS_WIDTH/this.img.width,
                        h = EVENTPICS_HEIGHT/this.img.height;
                    if (w < h) {
                        this.k = h;
                    } else {
                        this.k = w;
                    }
                    $('.crop-zoom-minus').attr("disabled", 'disabled');
                }
                this.resizeImage();
            },
            rotate: function (){
                this.rotateImage().done(this.resizeImage);
            }
        });
    return CropView;
});