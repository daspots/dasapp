(function() {
  window.api_call = function(method, url, params, data, callback) {
    var k, separator, v;
    callback = callback || data || params;
    data = data || params;
    if (arguments.length === 4) {
      data = void 0;
    }
    if (arguments.length === 3) {
      params = void 0;
      data = void 0;
    }
    params = params || {};
    for (k in params) {
      v = params[k];
      if (v == null) {
        delete params[k];
      }
    }
    separator = url.search('\\?') >= 0 ? '&' : '?';
    return $.ajax({
      type: method,
      url: "" + url + separator + ($.param(params)),
      contentType: 'application/json',
      accepts: 'application/json',
      dataType: 'json',
      data: data ? JSON.stringify(data) : void 0,
      success: function(data) {
        var more;
        if (data.status === 'success') {
          more = void 0;
          if (data.next_url) {
            more = function(callback) {
              return api_call(method, data.next_url, {}, callback);
            };
          }
          return typeof callback === "function" ? callback(void 0, data.result, more) : void 0;
        } else {
          return typeof callback === "function" ? callback(data) : void 0;
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        var e, error;
        error = {
          error_code: 'ajax_error',
          text_status: textStatus,
          error_thrown: errorThrown,
          jqXHR: jqXHR
        };
        try {
          if (jqXHR.responseText) {
            error = $.parseJSON(jqXHR.responseText);
          }
        } catch (error1) {
          e = error1;
          error = error;
        }
        LOG('api_call error', error);
        return typeof callback === "function" ? callback(error) : void 0;
      }
    });
  };

}).call(this);

(function() {
  var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  (function() {
    return window.FileUploader = (function() {
      function FileUploader(options) {
        var ref, xhr;
        this.options = options;
        this.upload_file = bind(this.upload_file, this);
        this.process_files = bind(this.process_files, this);
        this.get_upload_urls = bind(this.get_upload_urls, this);
        this.upload_files = bind(this.upload_files, this);
        this.file_select_handler = bind(this.file_select_handler, this);
        this.file_drag_hover = bind(this.file_drag_hover, this);
        this.upload_handler = this.options.upload_handler;
        this.selector = this.options.selector;
        this.drop_area = this.options.drop_area;
        this.upload_url = this.options.upload_url || ("/api/v1" + window.location.pathname);
        this.confirm_message = this.options.confirm_message || 'Files are still being uploaded.';
        this.allowed_types = this.options.allowed_types;
        this.max_size = this.options.max_size;
        this.active_files = 0;
        if ((ref = this.selector) != null) {
          ref.bind('change', (function(_this) {
            return function(e) {
              return _this.file_select_handler(e);
            };
          })(this));
        }
        xhr = new XMLHttpRequest();
        if ((this.drop_area != null) && xhr.upload) {
          this.drop_area.on('dragover', this.file_drag_hover);
          this.drop_area.on('dragleave', this.file_drag_hover);
          this.drop_area.on('drop', (function(_this) {
            return function(e) {
              return _this.file_select_handler(e);
            };
          })(this));
          this.drop_area.show();
        }
        window.onbeforeunload = (function(_this) {
          return function() {
            if ((_this.confirm_message != null) && _this.active_files > 0) {
              return _this.confirm_message;
            }
          };
        })(this);
      }

      FileUploader.prototype.file_drag_hover = function(e) {
        if (this.drop_area == null) {
          return;
        }
        e.stopPropagation();
        e.preventDefault();
        if (e.type === 'dragover') {
          return this.drop_area.addClass('drag-hover');
        } else {
          return this.drop_area.removeClass('drag-hover');
        }
      };

      FileUploader.prototype.file_select_handler = function(e) {
        var files, ref, ref1, ref2;
        this.file_drag_hover(e);
        files = ((ref = e.originalEvent.dataTransfer) != null ? ref.files : void 0) || ((ref1 = e.target) != null ? ref1.files : void 0) || ((ref2 = e.dataTransfer) != null ? ref2.files : void 0);
        if ((files != null ? files.length : void 0) > 0) {
          return this.upload_files(files);
        }
      };

      FileUploader.prototype.upload_files = function(files) {
        return this.get_upload_urls(files.length, (function(_this) {
          return function(error, urls) {
            if (error) {
              console.log('Error getting URLs', error);
              return;
            }
            return _this.process_files(files, urls, 0);
          };
        })(this));
      };

      FileUploader.prototype.get_upload_urls = function(n, callback) {
        if (n <= 0) {
          return;
        }
        return api_call('GET', this.upload_url, {
          count: n
        }, function(error, result) {
          if (error) {
            callback(error);
            throw error;
          }
          return callback(void 0, result);
        });
      };

      FileUploader.prototype.process_files = function(files, urls, i) {
        var ref;
        if (i >= files.length) {
          return;
        }
        return this.upload_file(files[i], urls[i].upload_url, (ref = this.upload_handler) != null ? ref.preview(files[i]) : void 0, (function(_this) {
          return function() {
            return _this.process_files(files, urls, i + 1, _this.upload_handler != null);
          };
        })(this));
      };

      FileUploader.prototype.upload_file = function(file, url, progress, callback) {
        var data, ref, ref1, xhr;
        xhr = new XMLHttpRequest();
        if (((ref = this.allowed_types) != null ? ref.length : void 0) > 0) {
          if (ref1 = file.type, indexOf.call(this.allowed_types, ref1) < 0) {
            progress(0, void 0, 'wrong_type');
            callback();
            return;
          }
        }
        if (this.max_size != null) {
          if (file.size > this.max_size) {
            progress(0, void 0, 'too_big');
            callback();
            return;
          }
        }
        xhr.upload.addEventListener('progress', function(event) {
          return progress(parseInt(event.loaded / event.total * 100.0));
        });
        xhr.onreadystatechange = (function(_this) {
          return function(event) {
            var response;
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                response = JSON.parse(xhr.responseText);
                progress(100.0, response.result);
                $('#image').val($('#image').val() + response.result.id + ';');
                return _this.active_files -= 1;
              } else {
                progress(0, void 0, 'error');
                return _this.active_files -= 1;
              }
            }
          };
        })(this);
        xhr.open('POST', url, true);
        data = new FormData();
        data.append('file', file);
        xhr.send(data);
        return callback();
      };

      return FileUploader;

    })();
  })();

}).call(this);

(function() {
  window.LOG = function() {
    return typeof console !== "undefined" && console !== null ? typeof console.log === "function" ? console.log.apply(console, arguments) : void 0 : void 0;
  };

  window.init_common = function() {
    init_loading_button();
    init_confirm_button();
    init_password_show_button();
    init_time();
    init_announcement();
    return init_row_link();
  };

  window.init_loading_button = function() {
    return $('body').on('click', '.btn-loading', function() {
      return $(this).button('loading');
    });
  };

  window.init_confirm_button = function() {
    return $('body').on('click', '.btn-confirm', function() {
      if (!confirm($(this).data('message') || 'Are you sure?')) {
        return event.preventDefault();
      }
    });
  };

  window.init_password_show_button = function() {
    return $('body').on('click', '.btn-password-show', function() {
      var $target;
      $target = $($(this).data('target'));
      $target.focus();
      if ($(this).hasClass('active')) {
        return $target.attr('type', 'password');
      } else {
        return $target.attr('type', 'text');
      }
    });
  };

  window.init_time = function() {
    var recalculate;
    if ($('time').length > 0) {
      recalculate = function() {
        $('time[datetime]').each(function() {
          var date, diff;
          date = moment.utc($(this).attr('datetime'));
          diff = moment().diff(date, 'days');
          if (diff > 25) {
            $(this).text(date.local().format('YYYY-MM-DD'));
          } else {
            $(this).text(date.fromNow());
          }
          return $(this).attr('title', date.local().format('dddd, MMMM Do YYYY, HH:mm:ss Z'));
        });
        return setTimeout(arguments.callee, 1000 * 45);
      };
      return recalculate();
    }
  };

  window.init_announcement = function() {
    $('.alert-announcement button.close').click(function() {
      return typeof sessionStorage !== "undefined" && sessionStorage !== null ? sessionStorage.setItem('closedAnnouncement', $('.alert-announcement').html()) : void 0;
    });
    if ((typeof sessionStorage !== "undefined" && sessionStorage !== null ? sessionStorage.getItem('closedAnnouncement') : void 0) !== $('.alert-announcement').html()) {
      return $('.alert-announcement').show();
    }
  };

  window.init_row_link = function() {
    $('body').on('click', '.row-link', function() {
      return window.location.href = $(this).data('href');
    });
    return $('body').on('click', '.not-link', function(e) {
      return e.stopPropagation();
    });
  };

  window.clear_notifications = function() {
    return $('#notifications').empty();
  };

  window.show_notification = function(message, category) {
    if (category == null) {
      category = 'warning';
    }
    clear_notifications();
    if (!message) {
      return;
    }
    return $('#notifications').append("<div class=\"alert alert-dismissable alert-" + category + "\">\n  <button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\">&times;</button>\n  " + message + "\n</div>");
  };

  window.size_human = function(nbytes) {
    var i, len, ref, suffix;
    ref = ['B', 'KB', 'MB', 'GB', 'TB'];
    for (i = 0, len = ref.length; i < len; i++) {
      suffix = ref[i];
      if (nbytes < 1000) {
        if (suffix === 'B') {
          return nbytes + " " + suffix;
        }
        return (parseInt(nbytes * 10) / 10) + " " + suffix;
      }
      nbytes /= 1024.0;
    }
  };

}).call(this);

(function() {
  $(function() {
    return init_common();
  });

  $(function() {
    return $('html.auth').each(function() {
      return init_auth();
    });
  });

  $(function() {
    return $('html.user-list').each(function() {
      return init_user_list();
    });
  });

  $(function() {
    return $('html.user-merge').each(function() {
      return init_user_merge();
    });
  });

  $(function() {
    return $('html.resource-list').each(function() {
      return init_resource_list();
    });
  });

  $(function() {
    return $('html.resource-view').each(function() {
      return init_resource_view();
    });
  });

  $(function() {
    return $('html.post-create').each(function() {
      return init_resource_upload();
    });
  });

  $(function() {
    return $('html.recommender-create').each(function() {
      return init_resource_upload();
    });
  });

}).call(this);

(function() {
  window.init_auth = function() {
    $('.remember').change(function() {
      var button, buttons, href, i, len, results;
      buttons = $('.btn-social').toArray().concat($('.btn-social-icon').toArray());
      results = [];
      for (i = 0, len = buttons.length; i < len; i++) {
        button = buttons[i];
        href = $(button).prop('href');
        if ($('.remember input').is(':checked')) {
          $(button).prop('href', href + "&remember=true");
          results.push($('#remember').prop('checked', true));
        } else {
          $(button).prop('href', href.replace('&remember=true', ''));
          results.push($('#remember').prop('checked', false));
        }
      }
      return results;
    });
    return $('.remember').change();
  };

}).call(this);

(function() {
  if ($(".pretty-file").length) {
    $(".pretty-file").each(function() {
      var file_input, pretty_file;
      pretty_file = $(this);
      file_input = pretty_file.find('input[type="file"]');
      file_input.hide();
      file_input.change(function() {
        var files, info, path;
        files = file_input[0].files;
        info = "";
        if (files.length > 1) {
          info = files.length + " files selected";
        } else {
          path = file_input.val().split("\\");
          info = path[path.length - 1];
        }
        return pretty_file.find(".input-group input").val(info);
      });
      return pretty_file.find(".input-group").click(function(e) {
        e.preventDefault();
        file_input.click();
        return $(this).blur();
      });
    });
  }

}).call(this);

(function() {
  var upload_handler;

  window.init_resource_list = function() {
    return init_delete_resource_button();
  };

  window.init_resource_view = function() {
    return init_delete_resource_button();
  };

  window.init_resource_upload = function() {
    if (window.File && window.FileList && window.FileReader) {
      return window.file_uploader = new FileUploader({
        upload_handler: upload_handler,
        selector: $('.file'),
        drop_area: $('.drop-area'),
        confirm_message: 'Files are still being uploaded.',
        upload_url: $('.file').data('get-upload-url'),
        allowed_types: [],
        max_size: 1024 * 1024 * 1024
      });
    }
  };

  upload_handler = {
    preview: function(file) {
      var $preview, $resource, reader;
      $resource = $("<div class=\"col-lg-2 col-md-3 col-sm-4 col-xs-6\">\n  <div class=\"thumbnail\">\n    <div class=\"preview\"></div>\n    <h5>" + file.name + "</h5>\n    <div class=\"progress\">\n      <div class=\"progress-bar\" style=\"width: 0%;\"></div>\n      <div class=\"progress-text\"></div>\n    </div>\n  </div>\n</div>");
      $preview = $('.preview', $resource);
      if (file_uploader.active_files < 16 && file.type.indexOf("image") === 0) {
        reader = new FileReader();
        reader.onload = (function(_this) {
          return function(e) {
            return $preview.css('background-image', "url(" + e.target.result + ")");
          };
        })(this);
        reader.readAsDataURL(file);
      } else {
        $preview.text(file.type || 'application/octet-stream');
      }
      $('.resource-uploads').prepend($resource);
      return (function(_this) {
        return function(progress, resource, error) {
          if (error) {
            $('.progress-bar', $resource).css('width', '100%');
            $('.progress-bar', $resource).addClass('progress-bar-danger');
            if (error === 'too_big') {
              $('.progress-text', $resource).text("Failed! Too big, max: " + (size_human(file_uploader.max_size)) + ".");
            } else if (error === 'wrong_type') {
              $('.progress-text', $resource).text("Failed! Wrong file type.");
            } else {
              $('.progress-text', $resource).text('Failed!');
            }
            return;
          }
          if (progress === 100.0 && resource) {
            $('.progress-bar', $resource).addClass('progress-bar-success');
            $('.progress-text', $resource).text("Success " + (size_human(file.size)));
            if (resource.image_url && $preview.text().length > 0) {
              $preview.css('background-image', "url(" + resource.image_url + ")");
              return $preview.text('');
            }
          } else if (progress === 100.0) {
            $('.progress-bar', $resource).css('width', '100%');
            return $('.progress-text', $resource).text("100% - Processing..");
          } else {
            $('.progress-bar', $resource).css('width', progress + "%");
            return $('.progress-text', $resource).text(progress + "% of " + (size_human(file.size)));
          }
        };
      })(this);
    }
  };

  window.init_delete_resource_button = function() {
    return $('body').on('click', '.btn-delete', function(e) {
      e.preventDefault();
      if (confirm('Press OK to delete the resource')) {
        $(this).attr('disabled', 'disabled');
        return api_call('DELETE', $(this).data('api-url'), (function(_this) {
          return function(err, result) {
            var redirect_url, target;
            if (err) {
              $(_this).removeAttr('disabled');
              LOG('Something went terribly wrong during delete!', err);
              return;
            }
            target = $(_this).data('target');
            redirect_url = $(_this).data('redirect-url');
            if (target) {
              $("" + target).remove();
            }
            if (redirect_url) {
              return window.location.href = redirect_url;
            }
          };
        })(this));
      }
    });
  };

}).call(this);

(function() {
  var init_user_delete_btn, init_user_merge_btn, init_user_selections, select_default_user, update_user_selections, user_select_row;

  window.init_user_list = function() {
    init_user_selections();
    init_user_delete_btn();
    return init_user_merge_btn();
  };

  init_user_selections = function() {
    $('input[name=user_db]').each(function() {
      return user_select_row($(this));
    });
    $('#select-all').change(function() {
      $('input[name=user_db]').prop('checked', $(this).is(':checked'));
      return $('input[name=user_db]').each(function() {
        return user_select_row($(this));
      });
    });
    return $('input[name=user_db]').change(function() {
      return user_select_row($(this));
    });
  };

  user_select_row = function($element) {
    update_user_selections();
    return $('input[name=user_db]').each(function() {
      var id;
      id = $element.val();
      return $("#" + id).toggleClass('warning', $element.is(':checked'));
    });
  };

  update_user_selections = function() {
    var selected;
    selected = $('input[name=user_db]:checked').length;
    $('#user-actions').toggleClass('hidden', selected === 0);
    $('#user-merge').toggleClass('hidden', selected < 2);
    if (selected === 0) {
      $('#select-all').prop('indeterminate', false);
      return $('#select-all').prop('checked', false);
    } else if ($('input[name=user_db]:not(:checked)').length === 0) {
      $('#select-all').prop('indeterminate', false);
      return $('#select-all').prop('checked', true);
    } else {
      return $('#select-all').prop('indeterminate', true);
    }
  };

  init_user_delete_btn = function() {
    return $('#user-delete').click(function(e) {
      var confirm_message, delete_url, error_message, success_message, user_keys;
      clear_notifications();
      e.preventDefault();
      confirm_message = ($(this).data('confirm')).replace('{users}', $('input[name=user_db]:checked').length);
      if (confirm(confirm_message)) {
        user_keys = [];
        $('input[name=user_db]:checked').each(function() {
          $(this).attr('disabled', true);
          return user_keys.push($(this).val());
        });
        delete_url = $(this).data('api-url');
        success_message = $(this).data('success');
        error_message = $(this).data('error');
        return api_call('DELETE', delete_url, {
          user_keys: user_keys.join(',')
        }, function(err, result) {
          if (err) {
            $('input[name=user_db]:disabled').removeAttr('disabled');
            show_notification(error_message.replace('{users}', user_keys.length), 'danger');
            return;
          }
          return $("#" + (result.join(', #'))).fadeOut(function() {
            $(this).remove();
            update_user_selections();
            return show_notification(success_message.replace('{users}', user_keys.length), 'success');
          });
        });
      }
    });
  };

  window.init_user_merge = function() {
    var api_url, user_keys;
    user_keys = $('#user_keys').val();
    api_url = $('.api-url').data('api-url');
    api_call('GET', api_url, {
      user_keys: user_keys
    }, function(error, result) {
      if (error) {
        LOG('Something went terribly wrong');
        return;
      }
      window.user_dbs = result;
      return $('input[name=user_db]').removeAttr('disabled');
    });
    return $('input[name=user_db]').change(function(event) {
      var user_key;
      user_key = $(event.currentTarget).val();
      return select_default_user(user_key);
    });
  };

  select_default_user = function(user_key) {
    var i, len, results, user_db;
    $('.user-row').removeClass('success').addClass('danger');
    $("#" + user_key).removeClass('danger').addClass('success');
    results = [];
    for (i = 0, len = user_dbs.length; i < len; i++) {
      user_db = user_dbs[i];
      if (user_key === user_db.key) {
        $('input[name=user_key]').val(user_db.key);
        $('input[name=username]').val(user_db.username);
        $('input[name=name]').val(user_db.name);
        $('input[name=email]').val(user_db.email);
        break;
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  init_user_merge_btn = function() {
    return $('#user-merge').click(function(e) {
      var user_keys, user_merge_url;
      e.preventDefault();
      user_keys = [];
      $('input[name=user_db]:checked').each(function() {
        return user_keys.push($(this).val());
      });
      user_merge_url = $(this).data('user-merge-url');
      return window.location.href = user_merge_url + "?user_keys=" + (user_keys.join(','));
    });
  };

}).call(this);


function followFunction(x, y) {

    api_url = '/api/v1/follow/' + y + '/';

    if(x.classList.contains("label-default")){
         if(x.classList.contains("not-logged-in")){
//            $("#loginform").css({"visibility":"visible","display":"block"});
            $(".recommender").css({"display":"none"});
            $("#loginform").fadeIn();
//            $("#restaurant").fadeOut();
         } else {

            x.classList.remove("label-default")
            x.classList.add("label-success")
            x.innerHTML='FOLLOWING';
            $.ajax({
                        url: api_url,    //Your api url
                        type: 'PUT',   //type is any HTTP method
                        data: {

                        },      //Data as js object
                        success: function () {
                        }
                    })
                    ;
         }

    } else if(x.classList.contains("label-success")){

        x.classList.remove("label-success")
        x.classList.add("label-default")
        x.innerHTML = 'FOLLOW';
        $.ajax({
                    url: api_url,
                    type: 'DELETE',
                    success: function(result) {
                        // Do something with the result
                    }
                })
                ;
    }
}

$("#toTop").hide();
$(window).scroll(function() {
  if ($(window).scrollTop() > 150) { $('#toTop').slideDown(150); 
  }
  if ($(window).scrollTop() < 150) { $('#toTop').slideUp(150); 
  }
});

window.onscroll = function() {myFunction()};
function myFunction() {
    if (document.body.scrollTop > 150 || document.documentElement.scrollTop > 150) {
        document.getElementsByClassName("navbarListElement").className = "test";
    } else {
        document.getElementsByClassName("navbarListElement").className = "";
    }
}


//(function webpackUniversalModuleDefinition(root,factory){if(typeof exports==="object"&&typeof module==="object")module.exports=factory();else if(typeof define==="function"&&define.amd)define("Gifffer",[],factory);else if(typeof exports==="object")exports["Gifffer"]=factory();else root["Gifffer"]=factory()})(this,function(){var d=document;var playSize=60;var Gifffer=function(options){var images,i=0,gifs=[];images=d.querySelectorAll("[data-gifffer]");for(;i<images.length;++i)process(images[i],gifs,options);return gifs};function formatUnit(v){return v+(v.toString().indexOf("%")>0?"":"px")}function parseStyles(styles){var stylesStr="";for(prop in styles)stylesStr+=prop+":"+styles[prop]+";";return stylesStr}function createContainer(w,h,el,altText,opts){var alt;var con=d.createElement("BUTTON");var cls=el.getAttribute("class");var id=el.getAttribute("id");var playButtonStyles=opts&&opts.playButtonStyles?parseStyles(opts.playButtonStyles):["width:"+playSize+"px","height:"+playSize+"px","border-radius:"+playSize/2+"px","background:rgba(0, 0, 0, 0.3)","position:absolute","top:50%","left:50%","margin:-"+playSize/2+"px"].join(";");var playButtonIconStyles=opts&&opts.playButtonIconStyles?parseStyles(opts.playButtonIconStyles):["width: 0","height: 0","border-top: 14px solid transparent","border-bottom: 14px solid transparent","border-left: 14px solid rgba(0, 0, 0, 0.5)","position: absolute","left: 26px","top: 16px"].join(";");cls?con.setAttribute("class",el.getAttribute("class")):null;id?con.setAttribute("id",el.getAttribute("id")):null;con.setAttribute("style","position:relative;cursor:pointer;background:none;border:none;padding:0;");con.setAttribute("aria-hidden","true");var play=d.createElement("DIV");play.setAttribute("class","gifffer-play-button");play.setAttribute("style",playButtonStyles);var trngl=d.createElement("DIV");trngl.setAttribute("style",playButtonIconStyles);play.appendChild(trngl);if(altText){alt=d.createElement("p");alt.setAttribute("class","gifffer-alt");alt.setAttribute("style","border:0;clip:rect(0 0 0 0);height:1px;overflow:hidden;padding:0;position:absolute;width:1px;");alt.innerText=altText+", image"}con.appendChild(play);el.parentNode.replaceChild(con,el);altText?con.parentNode.insertBefore(alt,con.nextSibling):null;return{c:con,p:play}}function calculatePercentageDim(el,w,h,wOrig,hOrig){var parentDimW=el.parentNode.offsetWidth;var parentDimH=el.parentNode.offsetHeight;var ratio=wOrig/hOrig;if(w.toString().indexOf("%")>0){w=parseInt(w.toString().replace("%",""));w=w/100*parentDimW;h=w/ratio}else if(h.toString().indexOf("%")>0){h=parseInt(h.toString().replace("%",""));h=h/100*parentDimW;w=h/ratio}return{w:w,h:h}}function process(el,gifs,options){var url,con,c,w,h,duration,play,gif,playing=false,cc,isC,durationTimeout,dims,altText;url=el.getAttribute("data-gifffer");w=el.getAttribute("data-gifffer-width");h=el.getAttribute("data-gifffer-height");duration=el.getAttribute("data-gifffer-duration");altText=el.getAttribute("data-gifffer-alt");el.style.display="block";c=document.createElement("canvas");isC=!!(c.getContext&&c.getContext("2d"));if(w&&h&&isC)cc=createContainer(w,h,el,altText,options);el.onload=function(){if(!isC)return;w=w||el.width;h=h||el.height;if(!cc)cc=createContainer(w,h,el,altText,options);con=cc.c;play=cc.p;dims=calculatePercentageDim(con,w,h,el.width,el.height);gifs.push(con);con.addEventListener("click",function(){clearTimeout(durationTimeout);if(!playing){playing=true;gif=document.createElement("IMG");gif.setAttribute("style","width:100%;height:100%;");gif.setAttribute("data-uri",Math.floor(Math.random()*1e5)+1);setTimeout(function(){gif.src=url},0);con.removeChild(play);con.removeChild(c);con.appendChild(gif);if(parseInt(duration)>0){durationTimeout=setTimeout(function(){playing=false;con.appendChild(play);con.removeChild(gif);con.appendChild(c);gif=null},duration)}}else{playing=false;con.appendChild(play);con.removeChild(gif);con.appendChild(c);gif=null}});c.width=dims.w;c.height=dims.h;c.getContext("2d").drawImage(el,0,0,dims.w,dims.h);con.appendChild(c);con.setAttribute("style","position:relative;cursor:pointer;width:"+dims.w+"px;height:"+dims.h+"px;background:none;border:none;padding:0;");c.style.width="100%";c.style.height="100%";if(w.toString().indexOf("%")>0&&h.toString().indexOf("%")>0){con.style.width=w;con.style.height=h}else if(w.toString().indexOf("%")>0){con.style.width=w;con.style.height="inherit"}else if(h.toString().indexOf("%")>0){con.style.width="inherit";con.style.height=h}else{con.style.width=dims.w+"px";con.style.height=dims.h+"px"}};el.src=url}return Gifffer});

// Following code adds typeahead keywords to search bars

var keywords = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    prefetch: {
    url: '/keywords',
    filter: function(list) {
      return $.map(list, function(cityname) {
        return { name: cityname }; });
    }
  }

});

keywords.initialize();

$('#search').typeahead(null, {
     minlength: 1,
     name: 'keywords',
     displayKey: 'name',
     valueKey: 'name',
     source: keywords.ttAdapter()
});

$('#search_page').typeahead(null, {
     minlength: 1,
     name: 'keywords',
     displayKey: 'name',
     valueKey: 'name',
     source: keywords.ttAdapter()
});



$('#keywords').tagsinput({
    confirmKeys: [13, 44],
    typeaheadjs: [{
          minLength: 1,
          highlight: true,

    },{
        minlength: 1,
        name: 'keywords',
        displayKey: 'name',
        valueKey: 'name',
        source: keywords.ttAdapter()
    }],
    freeInput: true,

});

$('#location_keywords').tagsinput({
    confirmKeys: [13, 44],
    typeaheadjs: [{
          minLength: 1,
          highlight: true,

    },{
        minlength: 1,
        name: 'keywords',
        displayKey: 'name',
        valueKey: 'name',
        source: keywords.ttAdapter()
    }],
    freeInput: true,

});

$('.draaiknopje').click(function () {
  setTimeout(function() {
    $('.grid').masonry('layout');
  }, 100);
});

$(document).ready(function() {
  Gifffer({
      playButtonStyles: {
        'width': '60px',
        'height': '60px',
        'border-radius': '30px',
        'background': 'rgba(0, 0, 0, 0.3)',
        'position': 'absolute',
        'top': '50%',
        'left': '50%',
        'margin': '-30px 0 0 -30px'
      },
      playButtonIconStyles: {
        'width': '0',
        'height': '0',
        'border-top': '14px solid transparent',
        'border-bottom': '14px solid transparent',
        'border-left': '14px solid rgba(255,255,255, 0.5)',
        'position': 'absolute',
        'left': '26px',
        'top': '16px'
      }
    });

    $('.grid').masonry({
      itemSelector: '.grid-item', // use a separate class for itemSelector, other than .col-
      columnWidth: '.grid-sizer',
      percentPosition: true
    });

    // layout Masonry after each image loads
    $('.grid').imagesLoaded().progress( function() {
      $('.grid').masonry('layout');
    });

 })

'use strict';

function escapeHTML(string) {
    return string.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getCleanName(feature, property){
    //return string stipped of html codes
    return escapeHTML(feature.getProperty(property));
}

function getKeywordUrls(mainUrl, keywordArray){
    // Returns a string of html links based on array of keywords
    var result = '';
    var aLen = Math.min(3,  keywordArray.length);
    for (var i = 0; i < aLen; i++) {
      html = [
        '<a class="thumbnailHashtag" href="' + mainUrl + keywordArray[i] + '">',
            '#' + keywordArray[i],
         '</a>'
      ].join("\n");
      result += html;
    }
    return result;
}


function generateBox(feature){
 // Generates the HTML code for the map info window
 var search_page_url = '/post/q/';

 var name = getCleanName(feature, 'name');
 var description = getCleanName(feature, 'description');
 var image_url = getCleanName(feature, 'image_url');
 var location_keyword = getCleanName(feature, 'location');
 var keywords = getCleanName(feature, 'keywords').split(',');
 var recommender = getCleanName(feature, 'recommender');
 var docid = getCleanName(feature, 'docid');
 var website = getCleanName(feature, 'website');
 var address = getCleanName(feature, 'address');


 var location_url = search_page_url + location_keyword;
 var keyword_urls = getKeywordUrls(search_page_url, keywords);
 var recommender_url = search_page_url + 'recommender=' + recommender.replace(',', '');
 var google_maps_directions = 'https://www.google.com/maps?saddr=My+Location&daddr=' + address.replace(' ', '+');

 var html = [
 '<div class="box" style="max-width:300px;">',
    
    // image
    '<img class="img-fluid" data-gifffer="' + image_url + '">',

    // start accordion
    '<div class="tab">',

    // icon list
    '<input id="' + docid + '" class="hidden draaiknopje" type="checkbox" name="tabs">',
        
      '<label for="' + docid + '">',

        // name spot
        '<ul class="additionalLinks" style="margin-left:0px;padding-left:0px;">',
        '<li class="iconList">',
            '<h1 class="thumbnailTitle">' + name + '</h1>',
            // link recommender
            '<a class="linkRecommendedBy" href="' + recommender_url + '"> BY ' + recommender + '</a>',
         '</li>',
        '</ul>',
        
      '</label>',
        
      // content accordion
      '<div class="tab-content">',
        '<p class="pLeft">' + description + '</p>',
      '</div>',

      // end accordion
      '</div>',

      // location
      '<div class="tab4">',
      '<i class="fa fa-map-pin" style="font-size:12px; padding: 5px 0px 5px 5px; color:#EEEEEE;" aria-hidden="true"></i>',
      '<a class="thumbnailLocation" href="' + location_url + '">',
                location_keyword,
      '</a>',
      '</div>',
       
      // link hashtags
      '<div class="tab4">',
      '<i class="fa fa-tag" style="font-size:12px; padding: 5px 0px 5px 5px; color:#EEEEEE;" aria-hidden="true"></i>',
      '<a class="thumbnailLocation">' + keyword_urls + 
      '</a>',
      '</div>',
    

      // external website
      '<div class="tab4">',
      '<i class="fa fa-map-signs" aria-hidden="true" style="font-size:12px; padding: 5px 0px 5px 5px; color:#EEEEEE;" aria-hidden="true"></i>',
          '<a class="thumbnailLocation" href="' + website + '">','</a>',
      '</div>',

      // direction
        '<div class="tab4" >',
        '<i class="fa fa-external-link" style="font-size:12px; padding: 5px 0px 5px 5px; color:#EEEEEE;" aria-hidden="true"></i>',
        '<a class="thumbnailLocation" href="' + address + '">','</a>',
        '</div>',

      '</div>',
 '</div>'
  ];
 return html.join("\n");

}


function processPoints(geometry, callback, thisArg) {
  if (geometry instanceof google.maps.LatLng) {
    callback.call(thisArg, geometry);
  } else if (geometry instanceof google.maps.Data.Point) {
    callback.call(thisArg, geometry.get());
  } else {
    geometry.getArray().forEach(function (g) {
      processPoints(g, callback, thisArg);
    });
  }
}

function initMap() {
  // Create the map.
  var map = new google.maps.Map(document.getElementsByClassName('map')[0], {
    zoom: 7,
    center: { lat: 0, lng: 0 },
  });

  var bounds = new google.maps.LatLngBounds();
  map.data.addListener('addfeature', function (e) {
    processPoints(e.feature.getGeometry(), bounds.extend, bounds);

    if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
       var extendPoint1 = new google.maps.LatLng(bounds.getNorthEast().lat() + 0.01, bounds.getNorthEast().lng() + 0.01);
       var extendPoint2 = new google.maps.LatLng(bounds.getNorthEast().lat() - 0.01, bounds.getNorthEast().lng() - 0.01);
       bounds.extend(extendPoint1);
       bounds.extend(extendPoint2);
    }

    map.fitBounds(bounds);
  });
  console.log(query);

  api_url = '/api/v1/post/' + query;
  // Load the stores GeoJSON onto the map.
  map.data.loadGeoJson(api_url);

  var apiKey = 'AIzaSyAbcMGMULgp5l0Trav2G3OseIrNGIxHDZk';
  var infoWindow = new google.maps.InfoWindow();
  infoWindow.setOptions({ pixelOffset: new google.maps.Size(0, -30) });

  // Show the information for a store when its marker is clicked.
  map.data.addListener('click', function (event) {
  var position = event.feature.getGeometry().get();
  var content = generateBox(event.feature);

  infoWindow.setContent(content);
  infoWindow.setPosition(position);

  infoWindow.open(map);

   Gifffer({
      playButtonStyles: {
        'width': '60px',
        'height': '60px',
        'border-radius': '30px',
        'background': 'rgba(0, 0, 0, 0.3)',
        'position': 'absolute',
        'top': '50%',
        'left': '50%',
        'margin': '-30px 0 0 -30px'
      },
      playButtonIconStyles: {
        'width': '0',
        'height': '0',
        'border-top': '14px solid transparent',
        'border-bottom': '14px solid transparent',
        'border-left': '14px solid rgba(255,255,255, 0.5)',
        'position': 'absolute',
        'left': '26px',
        'top': '16px'
      }
    });

  });
}

$('.map_link').on('click',function() {
  $("#restaurant").css({"display":"none"});

  $("#map").fadeIn();
  initMap();
  $("a.lista").css({"color":"gray"});
  $("a.mapa").css({"color":"black"});


})

$('.list_link').on('click',function() {
  $("#map").css({"display":"none"});
  $("#restaurant").fadeIn();

  $("a.lista").css({"color":"black"});
  $("a.mapa").css({"color":"gray"});

})



/*!
 * Masonry PACKAGED v4.2.0
 * Cascading grid layout library
 * http://masonry.desandro.com
 * MIT License
 * by David DeSandro
 */

!function(t,e){"function"==typeof define&&define.amd?define("jquery-bridget/jquery-bridget",["jquery"],function(i){return e(t,i)}):"object"==typeof module&&module.exports?module.exports=e(t,require("jquery")):t.jQueryBridget=e(t,t.jQuery)}(window,function(t,e){"use strict";function i(i,r,a){function h(t,e,n){var o,r="$()."+i+'("'+e+'")';return t.each(function(t,h){var u=a.data(h,i);if(!u)return void s(i+" not initialized. Cannot call methods, i.e. "+r);var d=u[e];if(!d||"_"==e.charAt(0))return void s(r+" is not a valid method");var l=d.apply(u,n);o=void 0===o?l:o}),void 0!==o?o:t}function u(t,e){t.each(function(t,n){var o=a.data(n,i);o?(o.option(e),o._init()):(o=new r(n,e),a.data(n,i,o))})}a=a||e||t.jQuery,a&&(r.prototype.option||(r.prototype.option=function(t){a.isPlainObject(t)&&(this.options=a.extend(!0,this.options,t))}),a.fn[i]=function(t){if("string"==typeof t){var e=o.call(arguments,1);return h(this,t,e)}return u(this,t),this},n(a))}function n(t){!t||t&&t.bridget||(t.bridget=i)}var o=Array.prototype.slice,r=t.console,s="undefined"==typeof r?function(){}:function(t){r.error(t)};return n(e||t.jQuery),i}),function(t,e){"function"==typeof define&&define.amd?define("ev-emitter/ev-emitter",e):"object"==typeof module&&module.exports?module.exports=e():t.EvEmitter=e()}("undefined"!=typeof window?window:this,function(){function t(){}var e=t.prototype;return e.on=function(t,e){if(t&&e){var i=this._events=this._events||{},n=i[t]=i[t]||[];return-1==n.indexOf(e)&&n.push(e),this}},e.once=function(t,e){if(t&&e){this.on(t,e);var i=this._onceEvents=this._onceEvents||{},n=i[t]=i[t]||{};return n[e]=!0,this}},e.off=function(t,e){var i=this._events&&this._events[t];if(i&&i.length){var n=i.indexOf(e);return-1!=n&&i.splice(n,1),this}},e.emitEvent=function(t,e){var i=this._events&&this._events[t];if(i&&i.length){var n=0,o=i[n];e=e||[];for(var r=this._onceEvents&&this._onceEvents[t];o;){var s=r&&r[o];s&&(this.off(t,o),delete r[o]),o.apply(this,e),n+=s?0:1,o=i[n]}return this}},t}),function(t,e){"use strict";"function"==typeof define&&define.amd?define("get-size/get-size",[],function(){return e()}):"object"==typeof module&&module.exports?module.exports=e():t.getSize=e()}(window,function(){"use strict";function t(t){var e=parseFloat(t),i=-1==t.indexOf("%")&&!isNaN(e);return i&&e}function e(){}function i(){for(var t={width:0,height:0,innerWidth:0,innerHeight:0,outerWidth:0,outerHeight:0},e=0;u>e;e++){var i=h[e];t[i]=0}return t}function n(t){var e=getComputedStyle(t);return e||a("Style returned "+e+". Are you running this code in a hidden iframe on Firefox? See http://bit.ly/getsizebug1"),e}function o(){if(!d){d=!0;var e=document.createElement("div");e.style.width="200px",e.style.padding="1px 2px 3px 4px",e.style.borderStyle="solid",e.style.borderWidth="1px 2px 3px 4px",e.style.boxSizing="border-box";var i=document.body||document.documentElement;i.appendChild(e);var o=n(e);r.isBoxSizeOuter=s=200==t(o.width),i.removeChild(e)}}function r(e){if(o(),"string"==typeof e&&(e=document.querySelector(e)),e&&"object"==typeof e&&e.nodeType){var r=n(e);if("none"==r.display)return i();var a={};a.width=e.offsetWidth,a.height=e.offsetHeight;for(var d=a.isBorderBox="border-box"==r.boxSizing,l=0;u>l;l++){var c=h[l],f=r[c],m=parseFloat(f);a[c]=isNaN(m)?0:m}var p=a.paddingLeft+a.paddingRight,g=a.paddingTop+a.paddingBottom,y=a.marginLeft+a.marginRight,v=a.marginTop+a.marginBottom,_=a.borderLeftWidth+a.borderRightWidth,z=a.borderTopWidth+a.borderBottomWidth,E=d&&s,b=t(r.width);b!==!1&&(a.width=b+(E?0:p+_));var x=t(r.height);return x!==!1&&(a.height=x+(E?0:g+z)),a.innerWidth=a.width-(p+_),a.innerHeight=a.height-(g+z),a.outerWidth=a.width+y,a.outerHeight=a.height+v,a}}var s,a="undefined"==typeof console?e:function(t){console.error(t)},h=["paddingLeft","paddingRight","paddingTop","paddingBottom","marginLeft","marginRight","marginTop","marginBottom","borderLeftWidth","borderRightWidth","borderTopWidth","borderBottomWidth"],u=h.length,d=!1;return r}),function(t,e){"use strict";"function"==typeof define&&define.amd?define("desandro-matches-selector/matches-selector",e):"object"==typeof module&&module.exports?module.exports=e():t.matchesSelector=e()}(window,function(){"use strict";var t=function(){var t=window.Element.prototype;if(t.matches)return"matches";if(t.matchesSelector)return"matchesSelector";for(var e=["webkit","moz","ms","o"],i=0;i<e.length;i++){var n=e[i],o=n+"MatchesSelector";if(t[o])return o}}();return function(e,i){return e[t](i)}}),function(t,e){"function"==typeof define&&define.amd?define("fizzy-ui-utils/utils",["desandro-matches-selector/matches-selector"],function(i){return e(t,i)}):"object"==typeof module&&module.exports?module.exports=e(t,require("desandro-matches-selector")):t.fizzyUIUtils=e(t,t.matchesSelector)}(window,function(t,e){var i={};i.extend=function(t,e){for(var i in e)t[i]=e[i];return t},i.modulo=function(t,e){return(t%e+e)%e},i.makeArray=function(t){var e=[];if(Array.isArray(t))e=t;else if(t&&"object"==typeof t&&"number"==typeof t.length)for(var i=0;i<t.length;i++)e.push(t[i]);else e.push(t);return e},i.removeFrom=function(t,e){var i=t.indexOf(e);-1!=i&&t.splice(i,1)},i.getParent=function(t,i){for(;t!=document.body;)if(t=t.parentNode,e(t,i))return t},i.getQueryElement=function(t){return"string"==typeof t?document.querySelector(t):t},i.handleEvent=function(t){var e="on"+t.type;this[e]&&this[e](t)},i.filterFindElements=function(t,n){t=i.makeArray(t);var o=[];return t.forEach(function(t){if(t instanceof HTMLElement){if(!n)return void o.push(t);e(t,n)&&o.push(t);for(var i=t.querySelectorAll(n),r=0;r<i.length;r++)o.push(i[r])}}),o},i.debounceMethod=function(t,e,i){var n=t.prototype[e],o=e+"Timeout";t.prototype[e]=function(){var t=this[o];t&&clearTimeout(t);var e=arguments,r=this;this[o]=setTimeout(function(){n.apply(r,e),delete r[o]},i||100)}},i.docReady=function(t){var e=document.readyState;"complete"==e||"interactive"==e?setTimeout(t):document.addEventListener("DOMContentLoaded",t)},i.toDashed=function(t){return t.replace(/(.)([A-Z])/g,function(t,e,i){return e+"-"+i}).toLowerCase()};var n=t.console;return i.htmlInit=function(e,o){i.docReady(function(){var r=i.toDashed(o),s="data-"+r,a=document.querySelectorAll("["+s+"]"),h=document.querySelectorAll(".js-"+r),u=i.makeArray(a).concat(i.makeArray(h)),d=s+"-options",l=t.jQuery;u.forEach(function(t){var i,r=t.getAttribute(s)||t.getAttribute(d);try{i=r&&JSON.parse(r)}catch(a){return void(n&&n.error("Error parsing "+s+" on "+t.className+": "+a))}var h=new e(t,i);l&&l.data(t,o,h)})})},i}),function(t,e){"function"==typeof define&&define.amd?define("outlayer/item",["ev-emitter/ev-emitter","get-size/get-size"],e):"object"==typeof module&&module.exports?module.exports=e(require("ev-emitter"),require("get-size")):(t.Outlayer={},t.Outlayer.Item=e(t.EvEmitter,t.getSize))}(window,function(t,e){"use strict";function i(t){for(var e in t)return!1;return e=null,!0}function n(t,e){t&&(this.element=t,this.layout=e,this.position={x:0,y:0},this._create())}function o(t){return t.replace(/([A-Z])/g,function(t){return"-"+t.toLowerCase()})}var r=document.documentElement.style,s="string"==typeof r.transition?"transition":"WebkitTransition",a="string"==typeof r.transform?"transform":"WebkitTransform",h={WebkitTransition:"webkitTransitionEnd",transition:"transitionend"}[s],u={transform:a,transition:s,transitionDuration:s+"Duration",transitionProperty:s+"Property",transitionDelay:s+"Delay"},d=n.prototype=Object.create(t.prototype);d.constructor=n,d._create=function(){this._transn={ingProperties:{},clean:{},onEnd:{}},this.css({position:"absolute"})},d.handleEvent=function(t){var e="on"+t.type;this[e]&&this[e](t)},d.getSize=function(){this.size=e(this.element)},d.css=function(t){var e=this.element.style;for(var i in t){var n=u[i]||i;e[n]=t[i]}},d.getPosition=function(){var t=getComputedStyle(this.element),e=this.layout._getOption("originLeft"),i=this.layout._getOption("originTop"),n=t[e?"left":"right"],o=t[i?"top":"bottom"],r=this.layout.size,s=-1!=n.indexOf("%")?parseFloat(n)/100*r.width:parseInt(n,10),a=-1!=o.indexOf("%")?parseFloat(o)/100*r.height:parseInt(o,10);s=isNaN(s)?0:s,a=isNaN(a)?0:a,s-=e?r.paddingLeft:r.paddingRight,a-=i?r.paddingTop:r.paddingBottom,this.position.x=s,this.position.y=a},d.layoutPosition=function(){var t=this.layout.size,e={},i=this.layout._getOption("originLeft"),n=this.layout._getOption("originTop"),o=i?"paddingLeft":"paddingRight",r=i?"left":"right",s=i?"right":"left",a=this.position.x+t[o];e[r]=this.getXValue(a),e[s]="";var h=n?"paddingTop":"paddingBottom",u=n?"top":"bottom",d=n?"bottom":"top",l=this.position.y+t[h];e[u]=this.getYValue(l),e[d]="",this.css(e),this.emitEvent("layout",[this])},d.getXValue=function(t){var e=this.layout._getOption("horizontal");return this.layout.options.percentPosition&&!e?t/this.layout.size.width*100+"%":t+"px"},d.getYValue=function(t){var e=this.layout._getOption("horizontal");return this.layout.options.percentPosition&&e?t/this.layout.size.height*100+"%":t+"px"},d._transitionTo=function(t,e){this.getPosition();var i=this.position.x,n=this.position.y,o=parseInt(t,10),r=parseInt(e,10),s=o===this.position.x&&r===this.position.y;if(this.setPosition(t,e),s&&!this.isTransitioning)return void this.layoutPosition();var a=t-i,h=e-n,u={};u.transform=this.getTranslate(a,h),this.transition({to:u,onTransitionEnd:{transform:this.layoutPosition},isCleaning:!0})},d.getTranslate=function(t,e){var i=this.layout._getOption("originLeft"),n=this.layout._getOption("originTop");return t=i?t:-t,e=n?e:-e,"translate3d("+t+"px, "+e+"px, 0)"},d.goTo=function(t,e){this.setPosition(t,e),this.layoutPosition()},d.moveTo=d._transitionTo,d.setPosition=function(t,e){this.position.x=parseInt(t,10),this.position.y=parseInt(e,10)},d._nonTransition=function(t){this.css(t.to),t.isCleaning&&this._removeStyles(t.to);for(var e in t.onTransitionEnd)t.onTransitionEnd[e].call(this)},d.transition=function(t){if(!parseFloat(this.layout.options.transitionDuration))return void this._nonTransition(t);var e=this._transn;for(var i in t.onTransitionEnd)e.onEnd[i]=t.onTransitionEnd[i];for(i in t.to)e.ingProperties[i]=!0,t.isCleaning&&(e.clean[i]=!0);if(t.from){this.css(t.from);var n=this.element.offsetHeight;n=null}this.enableTransition(t.to),this.css(t.to),this.isTransitioning=!0};var l="opacity,"+o(a);d.enableTransition=function(){if(!this.isTransitioning){var t=this.layout.options.transitionDuration;t="number"==typeof t?t+"ms":t,this.css({transitionProperty:l,transitionDuration:t,transitionDelay:this.staggerDelay||0}),this.element.addEventListener(h,this,!1)}},d.onwebkitTransitionEnd=function(t){this.ontransitionend(t)},d.onotransitionend=function(t){this.ontransitionend(t)};var c={"-webkit-transform":"transform"};d.ontransitionend=function(t){if(t.target===this.element){var e=this._transn,n=c[t.propertyName]||t.propertyName;if(delete e.ingProperties[n],i(e.ingProperties)&&this.disableTransition(),n in e.clean&&(this.element.style[t.propertyName]="",delete e.clean[n]),n in e.onEnd){var o=e.onEnd[n];o.call(this),delete e.onEnd[n]}this.emitEvent("transitionEnd",[this])}},d.disableTransition=function(){this.removeTransitionStyles(),this.element.removeEventListener(h,this,!1),this.isTransitioning=!1},d._removeStyles=function(t){var e={};for(var i in t)e[i]="";this.css(e)};var f={transitionProperty:"",transitionDuration:"",transitionDelay:""};return d.removeTransitionStyles=function(){this.css(f)},d.stagger=function(t){t=isNaN(t)?0:t,this.staggerDelay=t+"ms"},d.removeElem=function(){this.element.parentNode.removeChild(this.element),this.css({display:""}),this.emitEvent("remove",[this])},d.remove=function(){return s&&parseFloat(this.layout.options.transitionDuration)?(this.once("transitionEnd",function(){this.removeElem()}),void this.hide()):void this.removeElem()},d.reveal=function(){delete this.isHidden,this.css({display:""});var t=this.layout.options,e={},i=this.getHideRevealTransitionEndProperty("visibleStyle");e[i]=this.onRevealTransitionEnd,this.transition({from:t.hiddenStyle,to:t.visibleStyle,isCleaning:!0,onTransitionEnd:e})},d.onRevealTransitionEnd=function(){this.isHidden||this.emitEvent("reveal")},d.getHideRevealTransitionEndProperty=function(t){var e=this.layout.options[t];if(e.opacity)return"opacity";for(var i in e)return i},d.hide=function(){this.isHidden=!0,this.css({display:""});var t=this.layout.options,e={},i=this.getHideRevealTransitionEndProperty("hiddenStyle");e[i]=this.onHideTransitionEnd,this.transition({from:t.visibleStyle,to:t.hiddenStyle,isCleaning:!0,onTransitionEnd:e})},d.onHideTransitionEnd=function(){this.isHidden&&(this.css({display:"none"}),this.emitEvent("hide"))},d.destroy=function(){this.css({position:"",left:"",right:"",top:"",bottom:"",transition:"",transform:""})},n}),function(t,e){"use strict";"function"==typeof define&&define.amd?define("outlayer/outlayer",["ev-emitter/ev-emitter","get-size/get-size","fizzy-ui-utils/utils","./item"],function(i,n,o,r){return e(t,i,n,o,r)}):"object"==typeof module&&module.exports?module.exports=e(t,require("ev-emitter"),require("get-size"),require("fizzy-ui-utils"),require("./item")):t.Outlayer=e(t,t.EvEmitter,t.getSize,t.fizzyUIUtils,t.Outlayer.Item)}(window,function(t,e,i,n,o){"use strict";function r(t,e){var i=n.getQueryElement(t);if(!i)return void(h&&h.error("Bad element for "+this.constructor.namespace+": "+(i||t)));this.element=i,u&&(this.$element=u(this.element)),this.options=n.extend({},this.constructor.defaults),this.option(e);var o=++l;this.element.outlayerGUID=o,c[o]=this,this._create();var r=this._getOption("initLayout");r&&this.layout()}function s(t){function e(){t.apply(this,arguments)}return e.prototype=Object.create(t.prototype),e.prototype.constructor=e,e}function a(t){if("number"==typeof t)return t;var e=t.match(/(^\d*\.?\d*)(\w*)/),i=e&&e[1],n=e&&e[2];if(!i.length)return 0;i=parseFloat(i);var o=m[n]||1;return i*o}var h=t.console,u=t.jQuery,d=function(){},l=0,c={};r.namespace="outlayer",r.Item=o,r.defaults={containerStyle:{position:"relative"},initLayout:!0,originLeft:!0,originTop:!0,resize:!0,resizeContainer:!0,transitionDuration:"0.4s",hiddenStyle:{opacity:0,transform:"scale(0.001)"},visibleStyle:{opacity:1,transform:"scale(1)"}};var f=r.prototype;n.extend(f,e.prototype),f.option=function(t){n.extend(this.options,t)},f._getOption=function(t){var e=this.constructor.compatOptions[t];return e&&void 0!==this.options[e]?this.options[e]:this.options[t]},r.compatOptions={initLayout:"isInitLayout",horizontal:"isHorizontal",layoutInstant:"isLayoutInstant",originLeft:"isOriginLeft",originTop:"isOriginTop",resize:"isResizeBound",resizeContainer:"isResizingContainer"},f._create=function(){this.reloadItems(),this.stamps=[],this.stamp(this.options.stamp),n.extend(this.element.style,this.options.containerStyle);var t=this._getOption("resize");t&&this.bindResize()},f.reloadItems=function(){this.items=this._itemize(this.element.children)},f._itemize=function(t){for(var e=this._filterFindItemElements(t),i=this.constructor.Item,n=[],o=0;o<e.length;o++){var r=e[o],s=new i(r,this);n.push(s)}return n},f._filterFindItemElements=function(t){return n.filterFindElements(t,this.options.itemSelector)},f.getItemElements=function(){return this.items.map(function(t){return t.element})},f.layout=function(){this._resetLayout(),this._manageStamps();var t=this._getOption("layoutInstant"),e=void 0!==t?t:!this._isLayoutInited;this.layoutItems(this.items,e),this._isLayoutInited=!0},f._init=f.layout,f._resetLayout=function(){this.getSize()},f.getSize=function(){this.size=i(this.element)},f._getMeasurement=function(t,e){var n,o=this.options[t];o?("string"==typeof o?n=this.element.querySelector(o):o instanceof HTMLElement&&(n=o),this[t]=n?i(n)[e]:o):this[t]=0},f.layoutItems=function(t,e){t=this._getItemsForLayout(t),this._layoutItems(t,e),this._postLayout()},f._getItemsForLayout=function(t){return t.filter(function(t){return!t.isIgnored})},f._layoutItems=function(t,e){if(this._emitCompleteOnItems("layout",t),t&&t.length){var i=[];t.forEach(function(t){var n=this._getItemLayoutPosition(t);n.item=t,n.isInstant=e||t.isLayoutInstant,i.push(n)},this),this._processLayoutQueue(i)}},f._getItemLayoutPosition=function(){return{x:0,y:0}},f._processLayoutQueue=function(t){this.updateStagger(),t.forEach(function(t,e){this._positionItem(t.item,t.x,t.y,t.isInstant,e)},this)},f.updateStagger=function(){var t=this.options.stagger;return null===t||void 0===t?void(this.stagger=0):(this.stagger=a(t),this.stagger)},f._positionItem=function(t,e,i,n,o){n?t.goTo(e,i):(t.stagger(o*this.stagger),t.moveTo(e,i))},f._postLayout=function(){this.resizeContainer()},f.resizeContainer=function(){var t=this._getOption("resizeContainer");if(t){var e=this._getContainerSize();e&&(this._setContainerMeasure(e.width,!0),this._setContainerMeasure(e.height,!1))}},f._getContainerSize=d,f._setContainerMeasure=function(t,e){if(void 0!==t){var i=this.size;i.isBorderBox&&(t+=e?i.paddingLeft+i.paddingRight+i.borderLeftWidth+i.borderRightWidth:i.paddingBottom+i.paddingTop+i.borderTopWidth+i.borderBottomWidth),t=Math.max(t,0),this.element.style[e?"width":"height"]=t+"px"}},f._emitCompleteOnItems=function(t,e){function i(){o.dispatchEvent(t+"Complete",null,[e])}function n(){s++,s==r&&i()}var o=this,r=e.length;if(!e||!r)return void i();var s=0;e.forEach(function(e){e.once(t,n)})},f.dispatchEvent=function(t,e,i){var n=e?[e].concat(i):i;if(this.emitEvent(t,n),u)if(this.$element=this.$element||u(this.element),e){var o=u.Event(e);o.type=t,this.$element.trigger(o,i)}else this.$element.trigger(t,i)},f.ignore=function(t){var e=this.getItem(t);e&&(e.isIgnored=!0)},f.unignore=function(t){var e=this.getItem(t);e&&delete e.isIgnored},f.stamp=function(t){t=this._find(t),t&&(this.stamps=this.stamps.concat(t),t.forEach(this.ignore,this))},f.unstamp=function(t){t=this._find(t),t&&t.forEach(function(t){n.removeFrom(this.stamps,t),this.unignore(t)},this)},f._find=function(t){return t?("string"==typeof t&&(t=this.element.querySelectorAll(t)),t=n.makeArray(t)):void 0},f._manageStamps=function(){this.stamps&&this.stamps.length&&(this._getBoundingRect(),this.stamps.forEach(this._manageStamp,this))},f._getBoundingRect=function(){var t=this.element.getBoundingClientRect(),e=this.size;this._boundingRect={left:t.left+e.paddingLeft+e.borderLeftWidth,top:t.top+e.paddingTop+e.borderTopWidth,right:t.right-(e.paddingRight+e.borderRightWidth),bottom:t.bottom-(e.paddingBottom+e.borderBottomWidth)}},f._manageStamp=d,f._getElementOffset=function(t){var e=t.getBoundingClientRect(),n=this._boundingRect,o=i(t),r={left:e.left-n.left-o.marginLeft,top:e.top-n.top-o.marginTop,right:n.right-e.right-o.marginRight,bottom:n.bottom-e.bottom-o.marginBottom};return r},f.handleEvent=n.handleEvent,f.bindResize=function(){t.addEventListener("resize",this),this.isResizeBound=!0},f.unbindResize=function(){t.removeEventListener("resize",this),this.isResizeBound=!1},f.onresize=function(){this.resize()},n.debounceMethod(r,"onresize",100),f.resize=function(){this.isResizeBound&&this.needsResizeLayout()&&this.layout()},f.needsResizeLayout=function(){var t=i(this.element),e=this.size&&t;return e&&t.innerWidth!==this.size.innerWidth},f.addItems=function(t){var e=this._itemize(t);return e.length&&(this.items=this.items.concat(e)),e},f.appended=function(t){var e=this.addItems(t);e.length&&(this.layoutItems(e,!0),this.reveal(e))},f.prepended=function(t){var e=this._itemize(t);if(e.length){var i=this.items.slice(0);this.items=e.concat(i),this._resetLayout(),this._manageStamps(),this.layoutItems(e,!0),this.reveal(e),this.layoutItems(i)}},f.reveal=function(t){if(this._emitCompleteOnItems("reveal",t),t&&t.length){var e=this.updateStagger();t.forEach(function(t,i){t.stagger(i*e),t.reveal()})}},f.hide=function(t){if(this._emitCompleteOnItems("hide",t),t&&t.length){var e=this.updateStagger();t.forEach(function(t,i){t.stagger(i*e),t.hide()})}},f.revealItemElements=function(t){var e=this.getItems(t);this.reveal(e)},f.hideItemElements=function(t){var e=this.getItems(t);this.hide(e)},f.getItem=function(t){for(var e=0;e<this.items.length;e++){var i=this.items[e];if(i.element==t)return i}},f.getItems=function(t){t=n.makeArray(t);var e=[];return t.forEach(function(t){var i=this.getItem(t);i&&e.push(i)},this),e},f.remove=function(t){var e=this.getItems(t);this._emitCompleteOnItems("remove",e),e&&e.length&&e.forEach(function(t){t.remove(),n.removeFrom(this.items,t)},this)},f.destroy=function(){var t=this.element.style;t.height="",t.position="",t.width="",this.items.forEach(function(t){t.destroy()}),this.unbindResize();var e=this.element.outlayerGUID;delete c[e],delete this.element.outlayerGUID,u&&u.removeData(this.element,this.constructor.namespace)},r.data=function(t){t=n.getQueryElement(t);var e=t&&t.outlayerGUID;return e&&c[e]},r.create=function(t,e){var i=s(r);return i.defaults=n.extend({},r.defaults),n.extend(i.defaults,e),i.compatOptions=n.extend({},r.compatOptions),i.namespace=t,i.data=r.data,i.Item=s(o),n.htmlInit(i,t),u&&u.bridget&&u.bridget(t,i),i};var m={ms:1,s:1e3};return r.Item=o,r}),function(t,e){"function"==typeof define&&define.amd?define(["outlayer/outlayer","get-size/get-size"],e):"object"==typeof module&&module.exports?module.exports=e(require("outlayer"),require("get-size")):t.Masonry=e(t.Outlayer,t.getSize)}(window,function(t,e){var i=t.create("masonry");i.compatOptions.fitWidth="isFitWidth";var n=i.prototype;return n._resetLayout=function(){this.getSize(),this._getMeasurement("columnWidth","outerWidth"),this._getMeasurement("gutter","outerWidth"),this.measureColumns(),this.colYs=[];for(var t=0;t<this.cols;t++)this.colYs.push(0);this.maxY=0,this.horizontalColIndex=0},n.measureColumns=function(){if(this.getContainerWidth(),!this.columnWidth){var t=this.items[0],i=t&&t.element;this.columnWidth=i&&e(i).outerWidth||this.containerWidth}var n=this.columnWidth+=this.gutter,o=this.containerWidth+this.gutter,r=o/n,s=n-o%n,a=s&&1>s?"round":"floor";r=Math[a](r),this.cols=Math.max(r,1)},n.getContainerWidth=function(){var t=this._getOption("fitWidth"),i=t?this.element.parentNode:this.element,n=e(i);this.containerWidth=n&&n.innerWidth},n._getItemLayoutPosition=function(t){t.getSize();var e=t.size.outerWidth%this.columnWidth,i=e&&1>e?"round":"ceil",n=Math[i](t.size.outerWidth/this.columnWidth);n=Math.min(n,this.cols);for(var o=this.options.horizontalOrder?"_getHorizontalColPosition":"_getTopColPosition",r=this[o](n,t),s={x:this.columnWidth*r.col,y:r.y},a=r.y+t.size.outerHeight,h=n+r.col,u=r.col;h>u;u++)this.colYs[u]=a;return s},n._getTopColPosition=function(t){var e=this._getTopColGroup(t),i=Math.min.apply(Math,e);return{col:e.indexOf(i),y:i}},n._getTopColGroup=function(t){if(2>t)return this.colYs;for(var e=[],i=this.cols+1-t,n=0;i>n;n++)e[n]=this._getColGroupY(n,t);return e},n._getColGroupY=function(t,e){if(2>e)return this.colYs[t];var i=this.colYs.slice(t,t+e);return Math.max.apply(Math,i)},n._getHorizontalColPosition=function(t,e){var i=this.horizontalColIndex%this.cols,n=t>1&&i+t>this.cols;i=n?0:i;var o=e.size.outerWidth&&e.size.outerHeight;return this.horizontalColIndex=o?i+t:this.horizontalColIndex,{col:i,y:this._getColGroupY(i,t)}},n._manageStamp=function(t){var i=e(t),n=this._getElementOffset(t),o=this._getOption("originLeft"),r=o?n.left:n.right,s=r+i.outerWidth,a=Math.floor(r/this.columnWidth);a=Math.max(0,a);var h=Math.floor(s/this.columnWidth);h-=s%this.columnWidth?0:1,h=Math.min(this.cols-1,h);for(var u=this._getOption("originTop"),d=(u?n.top:n.bottom)+i.outerHeight,l=a;h>=l;l++)this.colYs[l]=Math.max(d,this.colYs[l])},n._getContainerSize=function(){this.maxY=Math.max.apply(Math,this.colYs);var t={height:this.maxY};return this._getOption("fitWidth")&&(t.width=this._getContainerFitWidth()),t},n._getContainerFitWidth=function(){for(var t=0,e=this.cols;--e&&0===this.colYs[e];)t++;return(this.cols-t)*this.columnWidth-this.gutter},n.needsResizeLayout=function(){var t=this.containerWidth;return this.getContainerWidth(),t!=this.containerWidth},i});

function starFunction(x, y) {

    api_url = '/api/v1/star/' + y + '/';

    if(x.classList.contains("fa-star-o")){
         if(x.classList.contains("not-logged-in")){
//            $("#loginform").css({"visibility":"visible","display":"block"});
            $("#restaurant").css({"display":"none"});
            $("#loginform").fadeIn();
//            $("#restaurant").fadeOut();
         } else {

            x.classList.remove("fa-star-o")
            x.classList.add("fa-star")
            $.ajax({
                        url: api_url,    //Your api url
                        type: 'PUT',   //type is any HTTP method
                        data: {

                        },      //Data as js object
                        success: function () {
                        }
                    })
                    ;
         }

    } else if(x.classList.contains("fa-star")){

        x.classList.remove("fa-star")
        x.classList.add("fa-star-o")
        $.ajax({
                    url: api_url,
                    type: 'DELETE',
                    success: function(result) {
                        // Do something with the result
                    }
                })
                ;
    }

}

$('.close-icon').on('click',function() {
  $(this).closest('.card').css({"display":"none"});
  $("#restaurant").fadeIn();
})




(function($){"use strict";var MagicSuggest=function(element,options){var ms=this;var defaults={allowFreeEntries:true,allowDuplicates:false,ajaxConfig:{},autoSelect:true,selectFirst:false,queryParam:"query",beforeSend:function(){},cls:"",data:null,dataUrlParams:{},disabled:false,disabledField:null,displayField:"name",editable:true,expanded:false,expandOnFocus:false,groupBy:null,hideTrigger:false,highlight:true,id:null,infoMsgCls:"",inputCfg:{},invalidCls:"ms-inv",matchCase:false,maxDropHeight:290,maxEntryLength:null,maxEntryRenderer:function(v){return"Please reduce your entry by "+v+" character"+(v>1?"s":"")},maxSuggestions:null,maxSelection:10,maxSelectionRenderer:function(v){return"You cannot choose more than "+v+" item"+(v>1?"s":"")},method:"POST",minChars:0,minCharsRenderer:function(v){return"Please type "+v+" more character"+(v>1?"s":"")},mode:"local",name:null,noSuggestionText:"No suggestions",placeholder:"Type or click here",renderer:null,required:false,resultAsString:false,resultAsStringDelimiter:",",resultsField:"results",selectionCls:"",selectionContainer:null,selectionPosition:"inner",selectionRenderer:null,selectionStacked:false,sortDir:"asc",sortOrder:null,strictSuggest:false,style:"",toggleOnClick:false,typeDelay:400,useTabKey:false,useCommaKey:true,useZebraStyle:false,value:null,valueField:"id",vregex:null,vtype:null};var conf=$.extend({},options);var cfg=$.extend(true,{},defaults,conf);this.addToSelection=function(items,isSilent){if(!cfg.maxSelection||_selection.length<cfg.maxSelection){if(!$.isArray(items)){items=[items]}var valuechanged=false;$.each(items,function(index,json){if(cfg.allowDuplicates||$.inArray(json[cfg.valueField],ms.getValue())===-1){_selection.push(json);valuechanged=true}});if(valuechanged===true){self._renderSelection();this.empty();if(isSilent!==true){$(this).trigger("selectionchange",[this,this.getSelection()])}}}this.input.attr("placeholder",cfg.selectionPosition==="inner"&&this.getValue().length>0?"":cfg.placeholder)};this.clear=function(isSilent){this.removeFromSelection(_selection.slice(0),isSilent)};this.collapse=function(){if(cfg.expanded===true){this.combobox.detach();cfg.expanded=false;$(this).trigger("collapse",[this])}};this.disable=function(){this.container.addClass("ms-ctn-disabled");cfg.disabled=true;ms.input.attr("disabled",true)};this.empty=function(){this.input.val("")};this.enable=function(){this.container.removeClass("ms-ctn-disabled");cfg.disabled=false;ms.input.attr("disabled",false)};this.expand=function(){if(!cfg.expanded&&(this.input.val().length>=cfg.minChars||this.combobox.children().size()>0)){this.combobox.appendTo(this.container);self._processSuggestions();cfg.expanded=true;$(this).trigger("expand",[this])}};this.isDisabled=function(){return cfg.disabled};this.isValid=function(){var valid=cfg.required===false||_selection.length>0;if(cfg.vtype||cfg.vregex){$.each(_selection,function(index,item){valid=valid&&self._validateSingleItem(item[cfg.valueField])})}return valid};this.getDataUrlParams=function(){return cfg.dataUrlParams};this.getName=function(){return cfg.name};this.getSelection=function(){return _selection};this.getRawValue=function(){return ms.input.val()};this.getValue=function(){return $.map(_selection,function(o){return o[cfg.valueField]})};this.removeFromSelection=function(items,isSilent){if(!$.isArray(items)){items=[items]}var valuechanged=false;$.each(items,function(index,json){var i=$.inArray(json[cfg.valueField],ms.getValue());if(i>-1){_selection.splice(i,1);valuechanged=true}});if(valuechanged===true){self._renderSelection();if(isSilent!==true){$(this).trigger("selectionchange",[this,this.getSelection()])}if(cfg.expandOnFocus){ms.expand()}if(cfg.expanded){self._processSuggestions()}}this.input.attr("placeholder",cfg.selectionPosition==="inner"&&this.getValue().length>0?"":cfg.placeholder)};this.getData=function(){return _cbData};this.setData=function(data){cfg.data=data;self._processSuggestions()};this.setName=function(name){cfg.name=name;if(name){cfg.name+=name.indexOf("[]")>0?"":"[]"}if(ms._valueContainer){$.each(ms._valueContainer.children(),function(i,el){el.name=cfg.name})}};this.setSelection=function(items){this.clear();this.addToSelection(items)};this.setValue=function(values){var items=[];$.each(values,function(index,value){var found=false;$.each(_cbData,function(i,item){if(item[cfg.valueField]==value){items.push(item);found=true;return false}});if(!found){if(typeof value==="object"){items.push(value)}else{var json={};json[cfg.valueField]=value;json[cfg.displayField]=value;items.push(json)}}});if(items.length>0){this.addToSelection(items)}};this.setDataUrlParams=function(params){cfg.dataUrlParams=$.extend({},params)};var _selection=[],_comboItemHeight=0,_timer,_hasFocus=false,_groups=null,_cbData=[],_ctrlDown=false,KEYCODES={BACKSPACE:8,TAB:9,ENTER:13,CTRL:17,ESC:27,SPACE:32,UPARROW:38,DOWNARROW:40,COMMA:188};var self={_displaySuggestions:function(data){ms.combobox.show();ms.combobox.empty();var resHeight=0,nbGroups=0;if(_groups===null){self._renderComboItems(data);resHeight=_comboItemHeight*data.length}else{for(var grpName in _groups){nbGroups+=1;$("<div/>",{"class":"ms-res-group",html:grpName}).appendTo(ms.combobox);self._renderComboItems(_groups[grpName].items,true)}var _groupItemHeight=ms.combobox.find(".ms-res-group").outerHeight();if(_groupItemHeight!==null){var tmpResHeight=nbGroups*_groupItemHeight;resHeight=_comboItemHeight*data.length+tmpResHeight}else{resHeight=_comboItemHeight*(data.length+nbGroups)}}if(resHeight<ms.combobox.height()||resHeight<=cfg.maxDropHeight){ms.combobox.height(resHeight)}else if(resHeight>=ms.combobox.height()&&resHeight>cfg.maxDropHeight){ms.combobox.height(cfg.maxDropHeight)}if(data.length===1&&cfg.autoSelect===true){ms.combobox.children().filter(":not(.ms-res-item-disabled):last").addClass("ms-res-item-active")}if(cfg.selectFirst===true){ms.combobox.children().filter(":not(.ms-res-item-disabled):first").addClass("ms-res-item-active")}if(data.length===0&&ms.getRawValue()!==""){var noSuggestionText=cfg.noSuggestionText.replace(/\{\{.*\}\}/,ms.input.val());self._updateHelper(noSuggestionText);ms.collapse()}if(cfg.allowFreeEntries===false){if(data.length===0){$(ms.input).addClass(cfg.invalidCls);ms.combobox.hide()}else{$(ms.input).removeClass(cfg.invalidCls)}}},_getEntriesFromStringArray:function(data){var json=[];$.each(data,function(index,s){var entry={};entry[cfg.displayField]=entry[cfg.valueField]=$.trim(s);json.push(entry)});return json},_highlightSuggestion:function(html){var q=ms.input.val();var specialCharacters=["^","$","*","+","?",".","(",")",":","!","|","{","}","[","]"];$.each(specialCharacters,function(index,value){q=q.replace(value,"\\"+value)});if(q.length===0){return html}var glob=cfg.matchCase===true?"g":"gi";return html.replace(new RegExp("("+q+")(?!([^<]+)?>)",glob),"<em>$1</em>")},_moveSelectedRow:function(dir){if(!cfg.expanded){ms.expand()}var list,start,active,scrollPos;list=ms.combobox.find(".ms-res-item:not(.ms-res-item-disabled)");if(dir==="down"){start=list.eq(0)}else{start=list.filter(":last")}active=ms.combobox.find(".ms-res-item-active:not(.ms-res-item-disabled):first");if(active.length>0){if(dir==="down"){start=active.nextAll(".ms-res-item:not(.ms-res-item-disabled)").first();if(start.length===0){start=list.eq(0)}scrollPos=ms.combobox.scrollTop();ms.combobox.scrollTop(0);if(start[0].offsetTop+start.outerHeight()>ms.combobox.height()){ms.combobox.scrollTop(scrollPos+_comboItemHeight)}}else{start=active.prevAll(".ms-res-item:not(.ms-res-item-disabled)").first();if(start.length===0){start=list.filter(":last");ms.combobox.scrollTop(_comboItemHeight*list.length)}if(start[0].offsetTop<ms.combobox.scrollTop()){ms.combobox.scrollTop(ms.combobox.scrollTop()-_comboItemHeight)}}}list.removeClass("ms-res-item-active");start.addClass("ms-res-item-active")},_processSuggestions:function(source){var json=null,data=source||cfg.data;if(data!==null){if(typeof data==="function"){data=data.call(ms,ms.getRawValue())}if(typeof data==="string"){$(ms).trigger("beforeload",[ms]);var queryParams={};queryParams[cfg.queryParam]=ms.input.val();var params=$.extend(queryParams,cfg.dataUrlParams);$.ajax($.extend({type:cfg.method,url:data,data:params,beforeSend:cfg.beforeSend,success:function(asyncData){json=typeof asyncData==="string"?JSON.parse(asyncData):asyncData;self._processSuggestions(json);$(ms).trigger("load",[ms,json]);if(self._asyncValues){ms.setValue(typeof self._asyncValues==="string"?JSON.parse(self._asyncValues):self._asyncValues);self._renderSelection();delete self._asyncValues}},error:function(){throw"Could not reach server"}},cfg.ajaxConfig));return}else{if(data.length>0&&typeof data[0]==="string"){_cbData=self._getEntriesFromStringArray(data)}else{_cbData=data[cfg.resultsField]||data}}var sortedData=cfg.mode==="remote"?_cbData:self._sortAndTrim(_cbData);self._displaySuggestions(self._group(sortedData))}},_render:function(el){ms.setName(cfg.name);ms.container=$("<div/>",{"class":"ms-ctn form-control "+(cfg.resultAsString?"ms-as-string ":"")+cfg.cls+($(el).hasClass("input-lg")?" input-lg":"")+($(el).hasClass("input-sm")?" input-sm":"")+(cfg.disabled===true?" ms-ctn-disabled":"")+(cfg.editable===true?"":" ms-ctn-readonly")+(cfg.hideTrigger===false?"":" ms-no-trigger"),style:cfg.style,id:cfg.id});ms.container.focus($.proxy(handlers._onFocus,this));ms.container.blur($.proxy(handlers._onBlur,this));ms.container.keydown($.proxy(handlers._onKeyDown,this));ms.container.keyup($.proxy(handlers._onKeyUp,this));ms.input=$("<input/>",$.extend({type:"text","class":cfg.editable===true?"":" ms-input-readonly",readonly:!cfg.editable,placeholder:cfg.placeholder,disabled:cfg.disabled},cfg.inputCfg));ms.input.focus($.proxy(handlers._onInputFocus,this));ms.input.click($.proxy(handlers._onInputClick,this));ms.combobox=$("<div/>",{"class":"ms-res-ctn dropdown-menu"}).height(cfg.maxDropHeight);ms.combobox.on("click","div.ms-res-item",$.proxy(handlers._onComboItemSelected,this));ms.combobox.on("mouseover","div.ms-res-item",$.proxy(handlers._onComboItemMouseOver,this));if(cfg.selectionContainer){ms.selectionContainer=cfg.selectionContainer;$(ms.selectionContainer).addClass("ms-sel-ctn")}else{ms.selectionContainer=$("<div/>",{"class":"ms-sel-ctn"})}ms.selectionContainer.click($.proxy(handlers._onFocus,this));if(cfg.selectionPosition==="inner"&&!cfg.selectionContainer){ms.selectionContainer.append(ms.input)}else{ms.container.append(ms.input)}ms.helper=$("<span/>",{"class":"ms-helper "+cfg.infoMsgCls});self._updateHelper();ms.container.append(ms.helper);$(el).replaceWith(ms.container);if(!cfg.selectionContainer){switch(cfg.selectionPosition){case"bottom":ms.selectionContainer.insertAfter(ms.container);if(cfg.selectionStacked===true){ms.selectionContainer.width(ms.container.width());ms.selectionContainer.addClass("ms-stacked")}break;case"right":ms.selectionContainer.insertAfter(ms.container);ms.container.css("float","left");break;default:ms.container.append(ms.selectionContainer);break}}if(cfg.hideTrigger===false){ms.trigger=$("<div/>",{"class":"ms-trigger",html:'<div class="ms-trigger-ico"></div>'});ms.trigger.click($.proxy(handlers._onTriggerClick,this));ms.container.append(ms.trigger)}$(window).resize($.proxy(handlers._onWindowResized,this));if(cfg.value!==null||cfg.data!==null){if(typeof cfg.data==="string"){self._asyncValues=cfg.value;self._processSuggestions()}else{self._processSuggestions();if(cfg.value!==null){ms.setValue(cfg.value);self._renderSelection()}}}$("body").click(function(e){if(ms.container.hasClass("ms-ctn-focus")&&ms.container.has(e.target).length===0&&e.target.className.indexOf("ms-res-item")<0&&e.target.className.indexOf("ms-close-btn")<0&&ms.container[0]!==e.target){handlers._onBlur()}});if(cfg.expanded===true){cfg.expanded=false;ms.expand()}},_renderComboItems:function(items,isGrouped){var ref=this,html="";$.each(items,function(index,value){var displayed=cfg.renderer!==null?cfg.renderer.call(ref,value):value[cfg.displayField];var disabled=cfg.disabledField!==null&&value[cfg.disabledField]===true;var resultItemEl=$("<div/>",{"class":"ms-res-item "+(isGrouped?"ms-res-item-grouped ":"")+(disabled?"ms-res-item-disabled ":"")+(index%2===1&&cfg.useZebraStyle===true?"ms-res-odd":""),html:cfg.highlight===true?self._highlightSuggestion(displayed):displayed,"data-json":JSON.stringify(value)});html+=$("<div/>").append(resultItemEl).html()});ms.combobox.append(html);_comboItemHeight=ms.combobox.find(".ms-res-item:first").outerHeight()},_renderSelection:function(){var ref=this,w=0,inputOffset=0,items=[],asText=cfg.resultAsString===true&&!_hasFocus;ms.selectionContainer.find(".ms-sel-item").remove();if(ms._valueContainer!==undefined){ms._valueContainer.remove()}$.each(_selection,function(index,value){var selectedItemEl,delItemEl,selectedItemHtml=cfg.selectionRenderer!==null?cfg.selectionRenderer.call(ref,value):value[cfg.displayField];var validCls=self._validateSingleItem(value[cfg.displayField])?"":" ms-sel-invalid";if(asText===true){selectedItemEl=$("<div/>",{"class":"ms-sel-item ms-sel-text "+cfg.selectionCls+validCls,html:selectedItemHtml+(index===_selection.length-1?"":cfg.resultAsStringDelimiter)}).data("json",value)}else{selectedItemEl=$("<div/>",{"class":"ms-sel-item "+cfg.selectionCls+validCls,html:selectedItemHtml}).data("json",value);if(cfg.disabled===false){delItemEl=$("<span/>",{"class":"ms-close-btn"}).data("json",value).appendTo(selectedItemEl);delItemEl.click($.proxy(handlers._onTagTriggerClick,ref))}}items.push(selectedItemEl)});ms.selectionContainer.prepend(items);ms._valueContainer=$("<div/>",{style:"display: none;"});$.each(ms.getValue(),function(i,val){var el=$("<input/>",{type:"hidden",name:cfg.name,value:val});el.appendTo(ms._valueContainer)});ms._valueContainer.appendTo(ms.selectionContainer);if(cfg.selectionPosition==="inner"&&!cfg.selectionContainer){ms.input.width(0);inputOffset=ms.input.offset().left-ms.selectionContainer.offset().left;w=ms.container.width()-inputOffset-42;ms.input.width(w)}if(_selection.length===cfg.maxSelection){self._updateHelper(cfg.maxSelectionRenderer.call(this,_selection.length))}else{ms.helper.hide()}},_selectItem:function(item){if(cfg.maxSelection===1){_selection=[]}ms.addToSelection(item.data("json"));item.removeClass("ms-res-item-active");if(cfg.expandOnFocus===false||_selection.length===cfg.maxSelection){ms.collapse()}if(!_hasFocus){ms.input.focus()}else if(_hasFocus&&(cfg.expandOnFocus||_ctrlDown)){self._processSuggestions();if(_ctrlDown){ms.expand()}}},_sortAndTrim:function(data){var q=ms.getRawValue(),filtered=[],newSuggestions=[],selectedValues=ms.getValue();if(q.length>0){$.each(data,function(index,obj){var name=obj[cfg.displayField];if(cfg.matchCase===true&&name.indexOf(q)>-1||cfg.matchCase===false&&name.toLowerCase().indexOf(q.toLowerCase())>-1){if(cfg.strictSuggest===false||name.toLowerCase().indexOf(q.toLowerCase())===0){filtered.push(obj)}}})}else{filtered=data}$.each(filtered,function(index,obj){if(cfg.allowDuplicates||$.inArray(obj[cfg.valueField],selectedValues)===-1){newSuggestions.push(obj)}});if(cfg.sortOrder!==null){newSuggestions.sort(function(a,b){if(a[cfg.sortOrder]<b[cfg.sortOrder]){return cfg.sortDir==="asc"?-1:1}if(a[cfg.sortOrder]>b[cfg.sortOrder]){return cfg.sortDir==="asc"?1:-1}return 0})}if(cfg.maxSuggestions&&cfg.maxSuggestions>0){newSuggestions=newSuggestions.slice(0,cfg.maxSuggestions)}return newSuggestions},_group:function(data){if(cfg.groupBy!==null){_groups={};$.each(data,function(index,value){var props=cfg.groupBy.indexOf(".")>-1?cfg.groupBy.split("."):cfg.groupBy;var prop=value[cfg.groupBy];if(typeof props!="string"){prop=value;while(props.length>0){prop=prop[props.shift()]}}if(_groups[prop]===undefined){_groups[prop]={title:prop,items:[value]}}else{_groups[prop].items.push(value)}})}return data},_updateHelper:function(html){ms.helper.html(html);if(!ms.helper.is(":visible")){ms.helper.fadeIn()}},_validateSingleItem:function(value){if(cfg.vregex!==null&&cfg.vregex instanceof RegExp){return cfg.vregex.test(value)}else if(cfg.vtype!==null){switch(cfg.vtype){case"alpha":return/^[a-zA-Z_]+$/.test(value);case"alphanum":return/^[a-zA-Z0-9_]+$/.test(value);case"email":return/^(\w+)([\-+.][\w]+)*@(\w[\-\w]*\.){1,5}([A-Za-z]){2,6}$/.test(value);case"url":return/(((^https?)|(^ftp)):\/\/([\-\w]+\.)+\w{2,3}(\/[%\-\w]+(\.\w{2,})?)*(([\w\-\.\?\\\/+@&#;`~=%!]*)(\.\w{2,})?)*\/?)/i.test(value);case"ipaddress":return/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)}}return true}};var handlers={_onBlur:function(){ms.container.removeClass("ms-ctn-focus");ms.collapse();_hasFocus=false;if(ms.getRawValue()!==""&&cfg.allowFreeEntries===true){var obj={};obj[cfg.displayField]=obj[cfg.valueField]=ms.getRawValue().trim();ms.addToSelection(obj)}self._renderSelection();if(ms.isValid()===false){ms.container.addClass(cfg.invalidCls)}else if(ms.input.val()!==""&&cfg.allowFreeEntries===false){ms.empty();self._updateHelper("")}$(ms).trigger("blur",[ms])},_onComboItemMouseOver:function(e){var target=$(e.currentTarget);if(!target.hasClass("ms-res-item-disabled")){ms.combobox.children().removeClass("ms-res-item-active");target.addClass("ms-res-item-active")}},_onComboItemSelected:function(e){var target=$(e.currentTarget);if(!target.hasClass("ms-res-item-disabled")){self._selectItem($(e.currentTarget))}},_onFocus:function(){ms.input.focus()},_onInputClick:function(){if(ms.isDisabled()===false&&_hasFocus){if(cfg.toggleOnClick===true){if(cfg.expanded){ms.collapse()}else{ms.expand()}}}},_onInputFocus:function(){if(ms.isDisabled()===false&&!_hasFocus){_hasFocus=true;ms.container.addClass("ms-ctn-focus");ms.container.removeClass(cfg.invalidCls);var curLength=ms.getRawValue().length;if(cfg.expandOnFocus===true){ms.expand()}if(_selection.length===cfg.maxSelection){self._updateHelper(cfg.maxSelectionRenderer.call(this,_selection.length))}else if(curLength<cfg.minChars){self._updateHelper(cfg.minCharsRenderer.call(this,cfg.minChars-curLength))}self._renderSelection();$(ms).trigger("focus",[ms])}},_onKeyDown:function(e){var active=ms.combobox.find(".ms-res-item-active:not(.ms-res-item-disabled):first"),freeInput=ms.input.val();$(ms).trigger("keydown",[ms,e]);if(e.keyCode===KEYCODES.TAB&&(cfg.useTabKey===false||cfg.useTabKey===true&&active.length===0&&ms.input.val().length===0)){handlers._onBlur();return}switch(e.keyCode){case KEYCODES.BACKSPACE:if(freeInput.length===0&&ms.getSelection().length>0&&cfg.selectionPosition==="inner"){_selection.pop();self._renderSelection();$(ms).trigger("selectionchange",[ms,ms.getSelection()]);ms.input.attr("placeholder",cfg.selectionPosition==="inner"&&ms.getValue().length>0?"":cfg.placeholder);ms.input.focus();e.preventDefault()}break;case KEYCODES.TAB:case KEYCODES.ESC:e.preventDefault();break;case KEYCODES.ENTER:if(freeInput!==""||cfg.expanded){e.preventDefault()}break;case KEYCODES.COMMA:if(cfg.useCommaKey===true){e.preventDefault()}break;case KEYCODES.CTRL:_ctrlDown=true;break;case KEYCODES.DOWNARROW:e.preventDefault();self._moveSelectedRow("down");break;case KEYCODES.UPARROW:e.preventDefault();self._moveSelectedRow("up");break;default:if(_selection.length===cfg.maxSelection){e.preventDefault()}break}},_onKeyUp:function(e){var freeInput=ms.getRawValue(),inputValid=$.trim(ms.input.val()).length>0&&(!cfg.maxEntryLength||$.trim(ms.input.val()).length<=cfg.maxEntryLength),selected,obj={};$(ms).trigger("keyup",[ms,e]);clearTimeout(_timer);if(e.keyCode===KEYCODES.ESC&&cfg.expanded){ms.combobox.hide()}if(e.keyCode===KEYCODES.TAB&&cfg.useTabKey===false||e.keyCode>KEYCODES.ENTER&&e.keyCode<KEYCODES.SPACE){if(e.keyCode===KEYCODES.CTRL){_ctrlDown=false}return}switch(e.keyCode){case KEYCODES.UPARROW:case KEYCODES.DOWNARROW:e.preventDefault();break;case KEYCODES.ENTER:case KEYCODES.TAB:case KEYCODES.COMMA:if(e.keyCode!==KEYCODES.COMMA||cfg.useCommaKey===true){e.preventDefault();if(cfg.expanded===true){selected=ms.combobox.find(".ms-res-item-active:not(.ms-res-item-disabled):first");if(selected.length>0){self._selectItem(selected);return}}if(inputValid===true&&cfg.allowFreeEntries===true){obj[cfg.displayField]=obj[cfg.valueField]=freeInput.trim();ms.addToSelection(obj);ms.collapse();ms.input.focus()}break}default:if(_selection.length===cfg.maxSelection){self._updateHelper(cfg.maxSelectionRenderer.call(this,_selection.length))}else{if(freeInput.length<cfg.minChars){self._updateHelper(cfg.minCharsRenderer.call(this,cfg.minChars-freeInput.length));if(cfg.expanded===true){ms.collapse()}}else if(cfg.maxEntryLength&&freeInput.length>cfg.maxEntryLength){self._updateHelper(cfg.maxEntryRenderer.call(this,freeInput.length-cfg.maxEntryLength));if(cfg.expanded===true){ms.collapse()}}else{ms.helper.hide();if(cfg.minChars<=freeInput.length){_timer=setTimeout(function(){if(cfg.expanded===true){self._processSuggestions()}else{ms.expand()}},cfg.typeDelay)}}}break}},_onTagTriggerClick:function(e){ms.removeFromSelection($(e.currentTarget).data("json"))},_onTriggerClick:function(){if(ms.isDisabled()===false&&!(cfg.expandOnFocus===true&&_selection.length===cfg.maxSelection)){$(ms).trigger("triggerclick",[ms]);if(cfg.expanded===true){ms.collapse()}else{var curLength=ms.getRawValue().length;if(curLength>=cfg.minChars){ms.input.focus();ms.expand()}else{self._updateHelper(cfg.minCharsRenderer.call(this,cfg.minChars-curLength))}}}},_onWindowResized:function(){self._renderSelection()}};if(element!==null){self._render(element)}};$.fn.magicSuggest=function(options){var obj=$(this);if(obj.size()===1&&obj.data("magicSuggest")){return obj.data("magicSuggest")}obj.each(function(i){var cntr=$(this);if(cntr.data("magicSuggest")){return}if(this.nodeName.toLowerCase()==="select"){options.data=[];options.value=[];$.each(this.children,function(index,child){if(child.nodeName&&child.nodeName.toLowerCase()==="option"){options.data.push({id:child.value,name:child.text});if($(child).attr("selected")){options.value.push(child.value)}}})}var def={};$.each(this.attributes,function(i,att){def[att.name]=att.name==="value"&&att.value!==""?JSON.parse(att.value):att.value});var field=new MagicSuggest(this,$.extend([],$.fn.magicSuggest.defaults,options,def));cntr.data("magicSuggest",field);field.container.data("magicSuggest",field)});if(obj.size()===1){return obj.data("magicSuggest")}return obj};$.fn.magicSuggest.defaults={}})(jQuery);
/**
 * Multiple Selection Component for Bootstrap
 * Check nicolasbize.github.io/magicsuggest/ for latest updates.
 *
 * Author:       Nicolas Bize
 * Created:      Feb 8th 2013
 * Last Updated: Oct 16th 2014
 * Version:      2.1.4
 * Licence:      MagicSuggest is licenced under MIT licence (http://opensource.org/licenses/MIT)
 */
(function($)
{
    "use strict";
    var MagicSuggest = function(element, options)
    {
        var ms = this;

        /**
         * Initializes the MagicSuggest component
         */
        var defaults = {
            /**********  CONFIGURATION PROPERTIES ************/
            /**
             * Restricts or allows the user to validate typed entries.
             * Defaults to true.
             */
            allowFreeEntries: true,

            /**
             * Restricts or allows the user to add the same entry more than once
             * Defaults to false.
             */
            allowDuplicates: false,

            /**
             * Additional config object passed to each $.ajax call
             */
            ajaxConfig: {},

            /**
             * If a single suggestion comes out, it is preselected.
             */
            autoSelect: true,

            /**
             * Auto select the first matching item with multiple items shown
             */
            selectFirst: false,

            /**
             * Allow customization of query parameter
             */
            queryParam: 'query',

            /**
             * A function triggered just before the ajax request is sent, similar to jQuery
             */
            beforeSend: function(){ },

            /**
             * A custom CSS class to apply to the field's underlying element.
             */
            cls: '',

            /**
             * JSON Data source used to populate the combo box. 3 options are available here:
             * No Data Source (default)
             *    When left null, the combo box will not suggest anything. It can still enable the user to enter
             *    multiple entries if allowFreeEntries is * set to true (default).
             * Static Source
             *    You can pass an array of JSON objects, an array of strings or even a single CSV string as the
             *    data source.For ex. data: [* {id:0,name:"Paris"}, {id: 1, name: "New York"}]
             *    You can also pass any json object with the results property containing the json array.
             * Url
             *     You can pass the url from which the component will fetch its JSON data.Data will be fetched
             *     using a POST ajax request that will * include the entered text as 'query' parameter. The results
             *     fetched from the server can be:
             *     - an array of JSON objects (ex: [{id:...,name:...},{...}])
             *     - a string containing an array of JSON objects ready to be parsed (ex: "[{id:...,name:...},{...}]")
             *     - a JSON object whose data will be contained in the results property
             *      (ex: {results: [{id:...,name:...},{...}]
             * Function
             *     You can pass a function which returns an array of JSON objects  (ex: [{id:...,name:...},{...}])
             *     The function can return the JSON data or it can use the first argument as function to handle the data.
             *     Only one (callback function or return value) is needed for the function to succeed.
             *     See the following example:
             *     function (response) { var myjson = [{name: 'test', id: 1}]; response(myjson); return myjson; }
             */
            data: null,

            /**
             * Additional parameters to the ajax call
             */
            dataUrlParams: {},

            /**
             * Start the component in a disabled state.
             */
            disabled: false,

            /**
             * Name of JSON object property that defines the disabled behaviour
             */
            disabledField: null,

            /**
             * Name of JSON object property displayed in the combo list
             */
            displayField: 'name',

            /**
             * Set to false if you only want mouse interaction. In that case the combo will
             * automatically expand on focus.
             */
            editable: true,

            /**
             * Set starting state for combo.
             */
            expanded: false,

            /**
             * Automatically expands combo on focus.
             */
            expandOnFocus: false,

            /**
             * JSON property by which the list should be grouped
             */
            groupBy: null,

            /**
             * Set to true to hide the trigger on the right
             */
            hideTrigger: false,

            /**
             * Set to true to highlight search input within displayed suggestions
             */
            highlight: true,

            /**
             * A custom ID for this component
             */
            id: null,

            /**
             * A class that is added to the info message appearing on the top-right part of the component
             */
            infoMsgCls: '',

            /**
             * Additional parameters passed out to the INPUT tag. Enables usage of AngularJS's custom tags for ex.
             */
            inputCfg: {},

            /**
             * The class that is applied to show that the field is invalid
             */
            invalidCls: 'ms-inv',

            /**
             * Set to true to filter data results according to case. Useless if the data is fetched remotely
             */
            matchCase: false,

            /**
             * Once expanded, the combo's height will take as much room as the # of available results.
             *    In case there are too many results displayed, this will fix the drop down height.
             */
            maxDropHeight: 290,

            /**
             * Defines how long the user free entry can be. Set to null for no limit.
             */
            maxEntryLength: null,

            /**
             * A function that defines the helper text when the max entry length has been surpassed.
             */
            maxEntryRenderer: function(v) {
                return 'Please reduce your entry by ' + v + ' character' + (v > 1 ? 's':'');
            },

            /**
             * The maximum number of results displayed in the combo drop down at once.
             */
            maxSuggestions: null,

            /**
             * The maximum number of items the user can select if multiple selection is allowed.
             *    Set to null to remove the limit.
             */
            maxSelection: 10,

            /**
             * A function that defines the helper text when the max selection amount has been reached. The function has a single
             *    parameter which is the number of selected elements.
             */
            maxSelectionRenderer: function(v) {
                return 'You cannot choose more than ' + v + ' item' + (v > 1 ? 's':'');
            },

            /**
             * The method used by the ajax request.
             */
            method: 'POST',

            /**
             * The minimum number of characters the user must type before the combo expands and offers suggestions.
             */
            minChars: 0,

            /**
             * A function that defines the helper text when not enough letters are set. The function has a single
             *    parameter which is the difference between the required amount of letters and the current one.
             */
            minCharsRenderer: function(v) {
                return 'Please type ' + v + ' more character' + (v > 1 ? 's':'');
            },

            /**
             * Whether or not sorting / filtering should be done remotely or locally.
             * Use either 'local' or 'remote'
             */
            mode: 'local',

            /**
             * The name used as a form element.
             */
            name: null,

            /**
             * The text displayed when there are no suggestions.
             */
            noSuggestionText: 'No suggestions',

            /**
             * The default placeholder text when nothing has been entered
             */
            placeholder: 'Type or click here',

            /**
             * A function used to define how the items will be presented in the combo
             */
            renderer: null,

            /**
             * Whether or not this field should be required
             */
            required: false,

            /**
             * Set to true to render selection as a delimited string
             */
            resultAsString: false,

            /**
             * Text delimiter to use in a delimited string.
             */
            resultAsStringDelimiter: ',',

            /**
             * Name of JSON object property that represents the list of suggested objects
             */
            resultsField: 'results',

            /**
             * A custom CSS class to add to a selected item
             */
            selectionCls: '',

            /**
             * An optional element replacement in which the selection is rendered
             */
            selectionContainer: null,

            /**
             * Where the selected items will be displayed. Only 'right', 'bottom' and 'inner' are valid values
             */
            selectionPosition: 'inner',

            /**
             * A function used to define how the items will be presented in the tag list
             */
            selectionRenderer: null,

            /**
             * Set to true to stack the selectioned items when positioned on the bottom
             *    Requires the selectionPosition to be set to 'bottom'
             */
            selectionStacked: false,

            /**
             * Direction used for sorting. Only 'asc' and 'desc' are valid values
             */
            sortDir: 'asc',

            /**
             * name of JSON object property for local result sorting.
             *    Leave null if you do not wish the results to be ordered or if they are already ordered remotely.
             */
            sortOrder: null,

            /**
             * If set to true, suggestions will have to start by user input (and not simply contain it as a substring)
             */
            strictSuggest: false,

            /**
             * Custom style added to the component container.
             */
            style: '',

            /**
             * If set to true, the combo will expand / collapse when clicked upon
             */
            toggleOnClick: false,


            /**
             * Amount (in ms) between keyboard registers.
             */
            typeDelay: 400,

            /**
             * If set to true, tab won't blur the component but will be registered as the ENTER key
             */
            useTabKey: false,

            /**
             * If set to true, using comma will validate the user's choice
             */
            useCommaKey: true,


            /**
             * Determines whether or not the results will be displayed with a zebra table style
             */
            useZebraStyle: false,

            /**
             * initial value for the field
             */
            value: null,

            /**
             * name of JSON object property that represents its underlying value
             */
            valueField: 'id',

            /**
             * regular expression to validate the values against
             */
            vregex: null,

            /**
             * type to validate against
             */
            vtype: null
        };

        var conf = $.extend({},options);
        var cfg = $.extend(true, {}, defaults, conf);

        /**********  PUBLIC METHODS ************/
        /**
         * Add one or multiple json items to the current selection
         * @param items - json object or array of json objects
         * @param isSilent - (optional) set to true to suppress 'selectionchange' event from being triggered
         */
        this.addToSelection = function(items, isSilent)
        {
            if (!cfg.maxSelection || _selection.length < cfg.maxSelection) {
                if (!$.isArray(items)) {
                    items = [items];
                }
                var valuechanged = false;
                $.each(items, function(index, json) {
                    if (cfg.allowDuplicates || $.inArray(json[cfg.valueField], ms.getValue()) === -1) {
                        _selection.push(json);
                        valuechanged = true;
                    }
                });
                if(valuechanged === true) {
                    self._renderSelection();
                    this.empty();
                    if (isSilent !== true) {
                        $(this).trigger('selectionchange', [this, this.getSelection()]);
                    }
                }
            }
            this.input.attr('placeholder', (cfg.selectionPosition === 'inner' && this.getValue().length > 0) ? '' : cfg.placeholder);
        };

        /**
         * Clears the current selection
         * @param isSilent - (optional) set to true to suppress 'selectionchange' event from being triggered
         */
        this.clear = function(isSilent)
        {
            this.removeFromSelection(_selection.slice(0), isSilent); // clone array to avoid concurrency issues
        };

        /**
         * Collapse the drop down part of the combo
         */
        this.collapse = function()
        {
            if (cfg.expanded === true) {
                this.combobox.detach();
                cfg.expanded = false;
                $(this).trigger('collapse', [this]);
            }
        };

        /**
         * Set the component in a disabled state.
         */
        this.disable = function()
        {
            this.container.addClass('ms-ctn-disabled');
            cfg.disabled = true;
            ms.input.attr('disabled', true);
        };

        /**
         * Empties out the combo user text
         */
        this.empty = function(){
            this.input.val('');
        };

        /**
         * Set the component in a enable state.
         */
        this.enable = function()
        {
            this.container.removeClass('ms-ctn-disabled');
            cfg.disabled = false;
            ms.input.attr('disabled', false);
        };

        /**
         * Expand the drop drown part of the combo.
         */
        this.expand = function()
        {
            if (!cfg.expanded && (this.input.val().length >= cfg.minChars || this.combobox.children().size() > 0)) {
                this.combobox.appendTo(this.container);
                self._processSuggestions();
                cfg.expanded = true;
                $(this).trigger('expand', [this]);
            }
        };

        /**
         * Retrieve component enabled status
         */
        this.isDisabled = function()
        {
            return cfg.disabled;
        };

        /**
         * Checks whether the field is valid or not
         * @return {boolean}
         */
        this.isValid = function()
        {
            var valid = cfg.required === false || _selection.length > 0;
            if(cfg.vtype || cfg.vregex){
                $.each(_selection, function(index, item){
                    valid = valid && self._validateSingleItem(item[cfg.valueField]);
                });
            }
            return valid;
        };

        /**
         * Gets the data params for current ajax request
         */
        this.getDataUrlParams = function()
        {
            return cfg.dataUrlParams;
        };

        /**
         * Gets the name given to the form input
         */
        this.getName = function()
        {
            return cfg.name;
        };

        /**
         * Retrieve an array of selected json objects
         * @return {Array}
         */
        this.getSelection = function()
        {
            return _selection;
        };

        /**
         * Retrieve the current text entered by the user
         */
        this.getRawValue = function(){
            return ms.input.val();
        };

        /**
         * Retrieve an array of selected values
         */
        this.getValue = function()
        {
            return $.map(_selection, function(o) {
                return o[cfg.valueField];
            });
        };

        /**
         * Remove one or multiples json items from the current selection
         * @param items - json object or array of json objects
         * @param isSilent - (optional) set to true to suppress 'selectionchange' event from being triggered
         */
        this.removeFromSelection = function(items, isSilent)
        {
            if (!$.isArray(items)) {
                items = [items];
            }
            var valuechanged = false;
            $.each(items, function(index, json) {
                var i = $.inArray(json[cfg.valueField], ms.getValue());
                if (i > -1) {
                    _selection.splice(i, 1);
                    valuechanged = true;
                }
            });
            if (valuechanged === true) {
                self._renderSelection();
                if(isSilent !== true){
                    $(this).trigger('selectionchange', [this, this.getSelection()]);
                }
                if(cfg.expandOnFocus){
                    ms.expand();
                }
                if(cfg.expanded) {
                    self._processSuggestions();
                }
            }
            this.input.attr('placeholder', (cfg.selectionPosition === 'inner' && this.getValue().length > 0) ? '' : cfg.placeholder);
        };

        /**
         * Get current data
         */
        this.getData = function(){
            return _cbData;
        };

        /**
         * Set up some combo data after it has been rendered
         * @param data
         */
        this.setData = function(data){
            cfg.data = data;
            self._processSuggestions();
        };

        /**
         * Sets the name for the input field so it can be fetched in the form
         * @param name
         */
        this.setName = function(name){
            cfg.name = name;
            if(name){
                cfg.name += name.indexOf('[]') > 0 ? '' : '[]';
            }
            if(ms._valueContainer){
                $.each(ms._valueContainer.children(), function(i, el){
                    el.name = cfg.name;
                });
            }
        };

        /**
         * Sets the current selection with the JSON items provided
         * @param items
         */
        this.setSelection = function(items){
            this.clear();
            this.addToSelection(items);
        };

        /**
         * Sets a value for the combo box. Value must be an array of values with data type matching valueField one.
         * @param data
         */
        this.setValue = function(values)
        {
            var items = [];

            $.each(values, function(index, value) {
                // first try to see if we have the full objects from our data set
                var found = false;
                $.each(_cbData, function(i,item){
                    if(item[cfg.valueField] == value){
                        items.push(item);
                        found = true;
                        return false;
                    }
                });
                if(!found){
                    if(typeof(value) === 'object'){
                        items.push(value);
                    } else {
                        var json = {};
                        json[cfg.valueField] = value;
                        json[cfg.displayField] = value;
                        items.push(json);
                    }
                }
            });
            if(items.length > 0) {
                this.addToSelection(items);
            }
        };

        /**
         * Sets data params for subsequent ajax requests
         * @param params
         */
        this.setDataUrlParams = function(params)
        {
            cfg.dataUrlParams = $.extend({},params);
        };

        /**********  PRIVATE ************/
        var _selection = [],      // selected objects
            _comboItemHeight = 0, // height for each combo item.
            _timer,
            _hasFocus = false,
            _groups = null,
            _cbData = [],
            _ctrlDown = false,
            KEYCODES = {
                BACKSPACE: 8,
                TAB: 9,
                ENTER: 13,
                CTRL: 17,
                ESC: 27,
                SPACE: 32,
                UPARROW: 38,
                DOWNARROW: 40,
                COMMA: 188
            };

        var self = {

            /**
             * Empties the result container and refills it with the array of json results in input
             * @private
             */
            _displaySuggestions: function(data) {
                ms.combobox.show();
                ms.combobox.empty();

                var resHeight = 0, // total height taken by displayed results.
                    nbGroups = 0;

                if(_groups === null) {
                    self._renderComboItems(data);
                    resHeight = _comboItemHeight * data.length;
                }
                else {
                    for(var grpName in _groups) {
                        nbGroups += 1;
                        $('<div/>', {
                            'class': 'ms-res-group',
                            html: grpName
                        }).appendTo(ms.combobox);
                        self._renderComboItems(_groups[grpName].items, true);
                    }
                    var _groupItemHeight = ms.combobox.find('.ms-res-group').outerHeight();
                    if(_groupItemHeight !== null) {
                      var tmpResHeight = nbGroups * _groupItemHeight;
                      resHeight = (_comboItemHeight * data.length) + tmpResHeight;
                    } else {
                      resHeight = _comboItemHeight * (data.length + nbGroups);
                    }
                }

                if(resHeight < ms.combobox.height() || resHeight <= cfg.maxDropHeight) {
                    ms.combobox.height(resHeight);
                }
                else if(resHeight >= ms.combobox.height() && resHeight > cfg.maxDropHeight) {
                    ms.combobox.height(cfg.maxDropHeight);
                }

                if(data.length === 1 && cfg.autoSelect === true) {
                    ms.combobox.children().filter(':not(.ms-res-item-disabled):last').addClass('ms-res-item-active');
                }

                if (cfg.selectFirst === true) {
                    ms.combobox.children().filter(':not(.ms-res-item-disabled):first').addClass('ms-res-item-active');
                }

                if(data.length === 0 && ms.getRawValue() !== "") {
                    var noSuggestionText = cfg.noSuggestionText.replace(/\{\{.*\}\}/, ms.input.val());
                    self._updateHelper(noSuggestionText);
                    ms.collapse();
                }

                // When free entry is off, add invalid class to input if no data matches
                if(cfg.allowFreeEntries === false) {
                  if(data.length === 0) {
                      $(ms.input).addClass(cfg.invalidCls);
                      ms.combobox.hide();
                  } else {
                    $(ms.input).removeClass(cfg.invalidCls);
                  }
                }
            },

            /**
             * Returns an array of json objects from an array of strings.
             * @private
             */
            _getEntriesFromStringArray: function(data) {
                var json = [];
                $.each(data, function(index, s) {
                    var entry = {};
                    entry[cfg.displayField] = entry[cfg.valueField] = $.trim(s);
                    json.push(entry);
                });
                return json;
            },

            /**
             * Replaces html with highlighted html according to case
             * @param html
             * @private
             */
            _highlightSuggestion: function(html) {
                var q = ms.input.val();

                //escape special regex characters
                var specialCharacters = ['^', '$', '*', '+', '?', '.', '(', ')', ':', '!', '|', '{', '}', '[', ']'];

                $.each(specialCharacters, function (index, value) {
                    q = q.replace(value, "\\" + value);
                })

                if(q.length === 0) {
                    return html; // nothing entered as input
                }

                var glob = cfg.matchCase === true ? 'g' : 'gi';
                return html.replace(new RegExp('(' + q + ')(?!([^<]+)?>)', glob), '<em>$1</em>');
            },

            /**
             * Moves the selected cursor amongst the list item
             * @param dir - 'up' or 'down'
             * @private
             */
            _moveSelectedRow: function(dir) {
                if(!cfg.expanded) {
                    ms.expand();
                }
                var list, start, active, scrollPos;
                list = ms.combobox.find(".ms-res-item:not(.ms-res-item-disabled)");
                if(dir === 'down') {
                    start = list.eq(0);
                }
                else {
                    start = list.filter(':last');
                }
                active = ms.combobox.find('.ms-res-item-active:not(.ms-res-item-disabled):first');
                if(active.length > 0) {
                    if(dir === 'down') {
                        start = active.nextAll('.ms-res-item:not(.ms-res-item-disabled)').first();
                        if(start.length === 0) {
                            start = list.eq(0);
                        }
                        scrollPos = ms.combobox.scrollTop();
                        ms.combobox.scrollTop(0);
                        if(start[0].offsetTop + start.outerHeight() > ms.combobox.height()) {
                            ms.combobox.scrollTop(scrollPos + _comboItemHeight);
                        }
                    }
                    else {
                        start = active.prevAll('.ms-res-item:not(.ms-res-item-disabled)').first();
                        if(start.length === 0) {
                            start = list.filter(':last');
                            ms.combobox.scrollTop(_comboItemHeight * list.length);
                        }
                        if(start[0].offsetTop < ms.combobox.scrollTop()) {
                            ms.combobox.scrollTop(ms.combobox.scrollTop() - _comboItemHeight);
                        }
                    }
                }
                list.removeClass("ms-res-item-active");
                start.addClass("ms-res-item-active");
            },

            /**
             * According to given data and query, sort and add suggestions in their container
             * @private
             */
            _processSuggestions: function(source) {
                var json = null, data = source || cfg.data;
                if(data !== null) {
                    if(typeof(data) === 'function'){
                        data = data.call(ms, ms.getRawValue());
                    }
                    if(typeof(data) === 'string') { // get results from ajax
                        $(ms).trigger('beforeload', [ms]);
                        var queryParams = {}
                        queryParams[cfg.queryParam] = ms.input.val();
                        var params = $.extend(queryParams, cfg.dataUrlParams);
                        $.ajax($.extend({
                            type: cfg.method,
                            url: data,
                            data: params,
                            beforeSend: cfg.beforeSend,
                            success: function(asyncData){
                                json = typeof(asyncData) === 'string' ? JSON.parse(asyncData) : asyncData;
                                self._processSuggestions(json);
                                $(ms).trigger('load', [ms, json]);
                                if(self._asyncValues){
                                    ms.setValue(typeof(self._asyncValues) === 'string' ? JSON.parse(self._asyncValues) : self._asyncValues);
                                    self._renderSelection();
                                    delete(self._asyncValues);
                                }
                            },
                            error: function(){
                                throw("Could not reach server");
                            }
                        }, cfg.ajaxConfig));
                        return;
                    } else { // results from local array
                        if(data.length > 0 && typeof(data[0]) === 'string') { // results from array of strings
                            _cbData = self._getEntriesFromStringArray(data);
                        } else { // regular json array or json object with results property
                            _cbData = data[cfg.resultsField] || data;
                        }
                    }
                    var sortedData = cfg.mode === 'remote' ? _cbData : self._sortAndTrim(_cbData);
                    self._displaySuggestions(self._group(sortedData));

                }
            },

            /**
             * Render the component to the given input DOM element
             * @private
             */
            _render: function(el) {
                ms.setName(cfg.name);  // make sure the form name is correct
                // holds the main div, will relay the focus events to the contained input element.
                ms.container = $('<div/>', {
                    'class': 'ms-ctn form-control ' + (cfg.resultAsString ? 'ms-as-string ' : '') + cfg.cls +
                        ($(el).hasClass('input-lg') ? ' input-lg' : '') +
                        ($(el).hasClass('input-sm') ? ' input-sm' : '') +
                        (cfg.disabled === true ? ' ms-ctn-disabled' : '') +
                        (cfg.editable === true ? '' : ' ms-ctn-readonly') +
                        (cfg.hideTrigger === false ? '' : ' ms-no-trigger'),
                    style: cfg.style,
                    id: cfg.id
                });
                ms.container.focus($.proxy(handlers._onFocus, this));
                ms.container.blur($.proxy(handlers._onBlur, this));
                ms.container.keydown($.proxy(handlers._onKeyDown, this));
                ms.container.keyup($.proxy(handlers._onKeyUp, this));

                // holds the input field
                ms.input = $('<input/>', $.extend({
                    type: 'text',
                    'class': cfg.editable === true ? '' : ' ms-input-readonly',
                    readonly: !cfg.editable,
                    placeholder: cfg.placeholder,
                    disabled: cfg.disabled
                }, cfg.inputCfg));

                ms.input.focus($.proxy(handlers._onInputFocus, this));
                ms.input.click($.proxy(handlers._onInputClick, this));

                // holds the suggestions. will always be placed on focus
                ms.combobox = $('<div/>', {
                    'class': 'ms-res-ctn dropdown-menu'
                }).height(cfg.maxDropHeight);

                // bind the onclick and mouseover using delegated events (needs jQuery >= 1.7)
                ms.combobox.on('click', 'div.ms-res-item', $.proxy(handlers._onComboItemSelected, this));
                ms.combobox.on('mouseover', 'div.ms-res-item', $.proxy(handlers._onComboItemMouseOver, this));

                if(cfg.selectionContainer){
                    ms.selectionContainer = cfg.selectionContainer;
                    $(ms.selectionContainer).addClass('ms-sel-ctn');
                } else {
                    ms.selectionContainer = $('<div/>', {
                        'class': 'ms-sel-ctn'
                    });
                }
                ms.selectionContainer.click($.proxy(handlers._onFocus, this));

                if(cfg.selectionPosition === 'inner' && !cfg.selectionContainer) {
                    ms.selectionContainer.append(ms.input);
                }
                else {
                    ms.container.append(ms.input);
                }

                ms.helper = $('<span/>', {
                    'class': 'ms-helper ' + cfg.infoMsgCls
                });
                self._updateHelper();
                ms.container.append(ms.helper);


                // Render the whole thing
                $(el).replaceWith(ms.container);

                if(!cfg.selectionContainer){
                    switch(cfg.selectionPosition) {
                        case 'bottom':
                            ms.selectionContainer.insertAfter(ms.container);
                            if(cfg.selectionStacked === true) {
                                ms.selectionContainer.width(ms.container.width());
                                ms.selectionContainer.addClass('ms-stacked');
                            }
                            break;
                        case 'right':
                            ms.selectionContainer.insertAfter(ms.container);
                            ms.container.css('float', 'left');
                            break;
                        default:
                            ms.container.append(ms.selectionContainer);
                            break;
                    }
                }


                // holds the trigger on the right side
                if(cfg.hideTrigger === false) {
                    ms.trigger = $('<div/>', {
                        'class': 'ms-trigger',
                        html: '<div class="ms-trigger-ico"></div>'
                    });
                    ms.trigger.click($.proxy(handlers._onTriggerClick, this));
                    ms.container.append(ms.trigger);
                }

                $(window).resize($.proxy(handlers._onWindowResized, this));

                // do not perform an initial call if we are using ajax unless we have initial values
                if(cfg.value !== null || cfg.data !== null){
                    if(typeof(cfg.data) === 'string'){
                        self._asyncValues = cfg.value;
                        self._processSuggestions();
                    } else {
                        self._processSuggestions();
                        if(cfg.value !== null){
                            ms.setValue(cfg.value);
                            self._renderSelection();
                        }
                    }

                }

                $("body").click(function(e) {
                    if(ms.container.hasClass('ms-ctn-focus') &&
                        ms.container.has(e.target).length === 0 &&
                        e.target.className.indexOf('ms-res-item') < 0 &&
                        e.target.className.indexOf('ms-close-btn') < 0 &&
                        ms.container[0] !== e.target) {
                        handlers._onBlur();
                    }
                });

                if(cfg.expanded === true) {
                    cfg.expanded = false;
                    ms.expand();
                }
            },

            /**
             * Renders each element within the combo box
             * @private
             */
            _renderComboItems: function(items, isGrouped) {
                var ref = this, html = '';
                $.each(items, function(index, value) {
                    var displayed = cfg.renderer !== null ? cfg.renderer.call(ref, value) : value[cfg.displayField];
                    var disabled = cfg.disabledField !== null && value[cfg.disabledField] === true;
                    var resultItemEl = $('<div/>', {
                        'class': 'ms-res-item ' + (isGrouped ? 'ms-res-item-grouped ':'') +
                            (disabled ? 'ms-res-item-disabled ':'') +
                            (index % 2 === 1 && cfg.useZebraStyle === true ? 'ms-res-odd' : ''),
                        html: cfg.highlight === true ? self._highlightSuggestion(displayed) : displayed,
                        'data-json': JSON.stringify(value)
                    });
                    html += $('<div/>').append(resultItemEl).html();
                });
                ms.combobox.append(html);
                _comboItemHeight = ms.combobox.find('.ms-res-item:first').outerHeight();
            },

            /**
             * Renders the selected items into their container.
             * @private
             */
            _renderSelection: function() {
                var ref = this, w = 0, inputOffset = 0, items = [],
                    asText = cfg.resultAsString === true && !_hasFocus;

                ms.selectionContainer.find('.ms-sel-item').remove();
                if(ms._valueContainer !== undefined) {
                    ms._valueContainer.remove();
                }

                $.each(_selection, function(index, value){

                    var selectedItemEl, delItemEl,
                        selectedItemHtml = cfg.selectionRenderer !== null ? cfg.selectionRenderer.call(ref, value) : value[cfg.displayField];

                    var validCls = self._validateSingleItem(value[cfg.displayField]) ? '' : ' ms-sel-invalid';

                    // tag representing selected value
                    if(asText === true) {
                        selectedItemEl = $('<div/>', {
                            'class': 'ms-sel-item ms-sel-text ' + cfg.selectionCls + validCls,
                            html: selectedItemHtml + (index === (_selection.length - 1) ? '' : cfg.resultAsStringDelimiter)
                        }).data('json', value);
                    }
                    else {
                        selectedItemEl = $('<div/>', {
                            'class': 'ms-sel-item ' + cfg.selectionCls + validCls,
                            html: selectedItemHtml
                        }).data('json', value);

                        if(cfg.disabled === false){
                            // small cross img
                            delItemEl = $('<span/>', {
                                'class': 'ms-close-btn'
                            }).data('json', value).appendTo(selectedItemEl);

                            delItemEl.click($.proxy(handlers._onTagTriggerClick, ref));
                        }
                    }

                    items.push(selectedItemEl);
                });
                ms.selectionContainer.prepend(items);

                // store the values, behaviour of multiple select
                ms._valueContainer = $('<div/>', {
                    style: 'display: none;'
                });
                $.each(ms.getValue(), function(i, val){
                    var el = $('<input/>', {
                        type: 'hidden',
                        name: cfg.name,
                        value: val
                    });
                    el.appendTo(ms._valueContainer);
                });
                ms._valueContainer.appendTo(ms.selectionContainer);

                if(cfg.selectionPosition === 'inner' && !cfg.selectionContainer) {
                    ms.input.width(0);
                    inputOffset = ms.input.offset().left - ms.selectionContainer.offset().left;
                    w = ms.container.width() - inputOffset - 42;
                    ms.input.width(w);
                }

                if(_selection.length === cfg.maxSelection){
                    self._updateHelper(cfg.maxSelectionRenderer.call(this, _selection.length));
                } else {
                    ms.helper.hide();
                }
            },

            /**
             * Select an item either through keyboard or mouse
             * @param item
             * @private
             */
            _selectItem: function(item) {
                if(cfg.maxSelection === 1){
                    _selection = [];
                }
                ms.addToSelection(item.data('json'));
                item.removeClass('ms-res-item-active');
                if(cfg.expandOnFocus === false || _selection.length === cfg.maxSelection){
                    ms.collapse();
                }
                if(!_hasFocus){
                    ms.input.focus();
                } else if(_hasFocus && (cfg.expandOnFocus || _ctrlDown)){
                    self._processSuggestions();
                    if(_ctrlDown){
                        ms.expand();
                    }
                }
            },

            /**
             * Sorts the results and cut them down to max # of displayed results at once
             * @private
             */
            _sortAndTrim: function(data) {
                var q = ms.getRawValue(),
                    filtered = [],
                    newSuggestions = [],
                    selectedValues = ms.getValue();
                // filter the data according to given input
                if(q.length > 0) {
                    $.each(data, function(index, obj) {
                        var name = obj[cfg.displayField];
                        if((cfg.matchCase === true && name.indexOf(q) > -1) ||
                            (cfg.matchCase === false && name.toLowerCase().indexOf(q.toLowerCase()) > -1)) {
                            if(cfg.strictSuggest === false || name.toLowerCase().indexOf(q.toLowerCase()) === 0) {
                                filtered.push(obj);
                            }
                        }
                    });
                }
                else {
                    filtered = data;
                }
                // take out the ones that have already been selected
                $.each(filtered, function(index, obj) {
                    if (cfg.allowDuplicates || $.inArray(obj[cfg.valueField], selectedValues) === -1) {
                        newSuggestions.push(obj);
                    }
                });
                // sort the data
                if(cfg.sortOrder !== null) {
                    newSuggestions.sort(function(a,b) {
                        if(a[cfg.sortOrder] < b[cfg.sortOrder]) {
                            return cfg.sortDir === 'asc' ? -1 : 1;
                        }
                        if(a[cfg.sortOrder] > b[cfg.sortOrder]) {
                            return cfg.sortDir === 'asc' ? 1 : -1;
                        }
                        return 0;
                    });
                }
                // trim it down
                if(cfg.maxSuggestions && cfg.maxSuggestions > 0) {
                    newSuggestions = newSuggestions.slice(0, cfg.maxSuggestions);
                }
                return newSuggestions;

            },

            _group: function(data){
                // build groups
                if(cfg.groupBy !== null) {
                    _groups = {};

                    $.each(data, function(index, value) {
                        var props = cfg.groupBy.indexOf('.') > -1 ? cfg.groupBy.split('.') : cfg.groupBy;
                        var prop = value[cfg.groupBy];
                        if(typeof(props) != 'string'){
                            prop = value;
                            while(props.length > 0){
                                prop = prop[props.shift()];
                            }
                        }
                        if(_groups[prop] === undefined) {
                            _groups[prop] = {title: prop, items: [value]};
                        }
                        else {
                            _groups[prop].items.push(value);
                        }
                    });
                }
                return data;
            },

            /**
             * Update the helper text
             * @private
             */
            _updateHelper: function(html) {
                ms.helper.html(html);
                if(!ms.helper.is(":visible")) {
                    ms.helper.fadeIn();
                }
            },

            /**
             * Validate an item against vtype or vregex
             * @private
             */
            _validateSingleItem: function(value){
                if(cfg.vregex !== null && cfg.vregex instanceof RegExp){
                    return cfg.vregex.test(value);
                } else if(cfg.vtype !== null) {
                    switch(cfg.vtype){
                        case 'alpha':
                        return (/^[a-zA-Z_]+$/).test(value);
                        case 'alphanum':
                        return (/^[a-zA-Z0-9_]+$/).test(value);
                        case 'email':
                        return (/^(\w+)([\-+.][\w]+)*@(\w[\-\w]*\.){1,5}([A-Za-z]){2,6}$/).test(value);
                        case 'url':
                        return (/(((^https?)|(^ftp)):\/\/([\-\w]+\.)+\w{2,3}(\/[%\-\w]+(\.\w{2,})?)*(([\w\-\.\?\\\/+@&#;`~=%!]*)(\.\w{2,})?)*\/?)/i).test(value);
                        case 'ipaddress':
                        return (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/).test(value);
                    }
                }
                return true;
            }
        };

        var handlers = {
            /**
             * Triggered when blurring out of the component
             * @private
             */
            _onBlur: function() {
                ms.container.removeClass('ms-ctn-focus');
                ms.collapse();
                _hasFocus = false;
                if(ms.getRawValue() !== '' && cfg.allowFreeEntries === true){
                    var obj = {};
                    obj[cfg.displayField] = obj[cfg.valueField] = ms.getRawValue().trim();
                    ms.addToSelection(obj);
                }
                self._renderSelection();

                if(ms.isValid() === false) {
                    ms.container.addClass(cfg.invalidCls);
                }

                else if(ms.input.val() !== '' && cfg.allowFreeEntries === false) {
                    ms.empty();
                    self._updateHelper('');
                }

                $(ms).trigger('blur', [ms]);
            },

            /**
             * Triggered when hovering an element in the combo
             * @param e
             * @private
             */
            _onComboItemMouseOver: function(e) {
                var target = $(e.currentTarget);
                if(!target.hasClass('ms-res-item-disabled')){
                    ms.combobox.children().removeClass('ms-res-item-active');
                    target.addClass('ms-res-item-active');
                }
            },

            /**
             * Triggered when an item is chosen from the list
             * @param e
             * @private
             */
            _onComboItemSelected: function(e) {
                var target = $(e.currentTarget);
                if(!target.hasClass('ms-res-item-disabled')){
                    self._selectItem($(e.currentTarget));
                }
            },

            /**
             * Triggered when focusing on the container div. Will focus on the input field instead.
             * @private
             */
            _onFocus: function() {
                ms.input.focus();
            },

            /**
             * Triggered when clicking on the input text field
             * @private
             */
            _onInputClick: function(){
                if (ms.isDisabled() === false && _hasFocus) {
                    if (cfg.toggleOnClick === true) {
                        if (cfg.expanded){
                            ms.collapse();
                        } else {
                            ms.expand();
                        }
                    }
                }
            },

            /**
             * Triggered when focusing on the input text field.
             * @private
             */
            _onInputFocus: function() {
                if(ms.isDisabled() === false && !_hasFocus) {
                    _hasFocus = true;
                    ms.container.addClass('ms-ctn-focus');
                    ms.container.removeClass(cfg.invalidCls);

                    var curLength = ms.getRawValue().length;
                    if(cfg.expandOnFocus === true){
                        ms.expand();
                    }

                    if(_selection.length === cfg.maxSelection) {
                        self._updateHelper(cfg.maxSelectionRenderer.call(this, _selection.length));
                    } else if(curLength < cfg.minChars) {
                        self._updateHelper(cfg.minCharsRenderer.call(this, cfg.minChars - curLength));
                    }

                    self._renderSelection();
                    $(ms).trigger('focus', [ms]);
                }
            },

            /**
             * Triggered when the user presses a key while the component has focus
             * This is where we want to handle all keys that don't require the user input field
             * since it hasn't registered the key hit yet
             * @param e keyEvent
             * @private
             */
            _onKeyDown: function(e) {
                // check how tab should be handled
                var active = ms.combobox.find('.ms-res-item-active:not(.ms-res-item-disabled):first'),
                    freeInput = ms.input.val();
                $(ms).trigger('keydown', [ms, e]);

                if(e.keyCode === KEYCODES.TAB && (cfg.useTabKey === false ||
                    (cfg.useTabKey === true && active.length === 0 && ms.input.val().length === 0))) {
                    handlers._onBlur();
                    return;
                }
                switch(e.keyCode) {
                    case KEYCODES.BACKSPACE:
                        if(freeInput.length === 0 && ms.getSelection().length > 0 && cfg.selectionPosition === 'inner') {
                            _selection.pop();
                            self._renderSelection();
                            $(ms).trigger('selectionchange', [ms, ms.getSelection()]);
                            ms.input.attr('placeholder', (cfg.selectionPosition === 'inner' && ms.getValue().length > 0) ? '' : cfg.placeholder);
                            ms.input.focus();
                            e.preventDefault();
                        }
                        break;
                    case KEYCODES.TAB:
                    case KEYCODES.ESC:
                        e.preventDefault();
                        break;
                    case KEYCODES.ENTER:
                        if(freeInput !== '' || cfg.expanded){
                            e.preventDefault();
                        }
                        break;
                    case KEYCODES.COMMA:
                        if(cfg.useCommaKey === true){
                            e.preventDefault();
                        }
                        break;
                    case KEYCODES.CTRL:
                        _ctrlDown = true;
                        break;
                    case KEYCODES.DOWNARROW:
                        e.preventDefault();
                        self._moveSelectedRow("down");
                        break;
                    case KEYCODES.UPARROW:
                        e.preventDefault();
                        self._moveSelectedRow("up");
                        break;
                    default:
                        if(_selection.length === cfg.maxSelection) {
                            e.preventDefault();
                        }
                        break;
                }
            },

            /**
             * Triggered when a key is released while the component has focus
             * @param e
             * @private
             */
            _onKeyUp: function(e) {
                var freeInput = ms.getRawValue(),
                    inputValid = $.trim(ms.input.val()).length > 0 &&
                        (!cfg.maxEntryLength || $.trim(ms.input.val()).length <= cfg.maxEntryLength),
                    selected,
                    obj = {};

                $(ms).trigger('keyup', [ms, e]);

                clearTimeout(_timer);

                // collapse if escape, but keep focus.
                if(e.keyCode === KEYCODES.ESC && cfg.expanded) {
                    ms.combobox.hide();
                }
                // ignore a bunch of keys
                if((e.keyCode === KEYCODES.TAB && cfg.useTabKey === false) || (e.keyCode > KEYCODES.ENTER && e.keyCode < KEYCODES.SPACE)) {
                    if(e.keyCode === KEYCODES.CTRL){
                        _ctrlDown = false;
                    }
                    return;
                }
                switch(e.keyCode) {
                    case KEYCODES.UPARROW:
                    case KEYCODES.DOWNARROW:
                    e.preventDefault();
                    break;
                    case KEYCODES.ENTER:
                    case KEYCODES.TAB:
                    case KEYCODES.COMMA:
                    if(e.keyCode !== KEYCODES.COMMA || cfg.useCommaKey === true) {
                        e.preventDefault();
                        if(cfg.expanded === true){ // if a selection is performed, select it and reset field
                            selected = ms.combobox.find('.ms-res-item-active:not(.ms-res-item-disabled):first');
                            if(selected.length > 0) {
                                self._selectItem(selected);
                                return;
                            }
                        }
                        // if no selection or if freetext entered and free entries allowed, add new obj to selection
                        if(inputValid === true && cfg.allowFreeEntries === true) {
                            obj[cfg.displayField] = obj[cfg.valueField] = freeInput.trim();
                            ms.addToSelection(obj);
                            ms.collapse(); // reset combo suggestions
                            ms.input.focus();
                        }
                        break;
                    }
                    default:
                        if(_selection.length === cfg.maxSelection){
                            self._updateHelper(cfg.maxSelectionRenderer.call(this, _selection.length));
                        }
                        else {
                            if(freeInput.length < cfg.minChars) {
                                self._updateHelper(cfg.minCharsRenderer.call(this, cfg.minChars - freeInput.length));
                                if(cfg.expanded === true) {
                                    ms.collapse();
                                }
                            }
                            else if(cfg.maxEntryLength && freeInput.length > cfg.maxEntryLength) {
                                self._updateHelper(cfg.maxEntryRenderer.call(this, freeInput.length - cfg.maxEntryLength));
                                if(cfg.expanded === true) {
                                    ms.collapse();
                                }
                            }
                            else {
                                ms.helper.hide();
                                if(cfg.minChars <= freeInput.length){
                                    _timer = setTimeout(function() {
                                        if(cfg.expanded === true) {
                                            self._processSuggestions();
                                        } else {
                                            ms.expand();
                                        }
                                    }, cfg.typeDelay);
                                }
                            }
                        }
                        break;
                }
            },

            /**
             * Triggered when clicking upon cross for deletion
             * @param e
             * @private
             */
            _onTagTriggerClick: function(e) {
                ms.removeFromSelection($(e.currentTarget).data('json'));
            },

            /**
             * Triggered when clicking on the small trigger in the right
             * @private
             */
            _onTriggerClick: function() {
                if(ms.isDisabled() === false && !(cfg.expandOnFocus === true && _selection.length === cfg.maxSelection)) {
                    $(ms).trigger('triggerclick', [ms]);
                    if(cfg.expanded === true) {
                        ms.collapse();
                    } else {
                        var curLength = ms.getRawValue().length;
                        if(curLength >= cfg.minChars){
                            ms.input.focus();
                            ms.expand();
                        } else {
                            self._updateHelper(cfg.minCharsRenderer.call(this, cfg.minChars - curLength));
                        }
                    }
                }
            },

            /**
             * Triggered when the browser window is resized
             * @private
             */
            _onWindowResized: function() {
                self._renderSelection();
            }
        };

        // startup point
        if(element !== null) {
            self._render(element);
        }
    };

    $.fn.magicSuggest = function(options) {
        var obj = $(this);

        if(obj.size() === 1 && obj.data('magicSuggest')) {
            return obj.data('magicSuggest');
        }

        obj.each(function(i) {
            // assume $(this) is an element
            var cntr = $(this);

            // Return early if this element already has a plugin instance
            if(cntr.data('magicSuggest')){
                return;
            }

            if(this.nodeName.toLowerCase() === 'select'){ // rendering from select
                options.data = [];
                options.value = [];
                $.each(this.children, function(index, child){
                    if(child.nodeName && child.nodeName.toLowerCase() === 'option'){
                        options.data.push({id: child.value, name: child.text});
                        if($(child).attr('selected')){
                            options.value.push(child.value);
                        }
                    }
                });
            }

            var def = {};
            // set values from DOM container element
            $.each(this.attributes, function(i, att){
                def[att.name] = att.name === 'value' && att.value !== '' ? JSON.parse(att.value) : att.value;
            });

            var field = new MagicSuggest(this, $.extend([], $.fn.magicSuggest.defaults, options, def));
            cntr.data('magicSuggest', field);
            field.container.data('magicSuggest', field);
        });

        if(obj.size() === 1) {
            return obj.data('magicSuggest');
        }
        return obj;
    };

   $.fn.magicSuggest.defaults = {};
})(jQuery);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1vbi9hcGkuY29mZmVlIiwiY29tbW9uL3VwbG9hZC5jb2ZmZWUiLCJjb21tb24vdXRpbC5jb2ZmZWUiLCJzaXRlL2FwcC5jb2ZmZWUiLCJzaXRlL2F1dGguY29mZmVlIiwic2l0ZS9wcmV0dHktZmlsZS5jb2ZmZWUiLCJzaXRlL3Jlc291cmNlLmNvZmZlZSIsInNpdGUvdXNlci5jb2ZmZWUiLCJmb2xsb3dfY29kZS5qcyIsImdpZmZmZXIuanMiLCJsb2FkLmpzIiwibWFwcy5qcyIsIm1hc29ucnkucGtnZC5taW4uanMiLCJzdGFyX2NvZGUuanMiLCJzaXRlL25pY29sYXNiaXplLW1hZ2ljc3VnZ2VzdC0yMzBiMDhiL21hZ2ljc3VnZ2VzdC1taW4uanMiLCJzaXRlL25pY29sYXNiaXplLW1hZ2ljc3VnZ2VzdC0yMzBiMDhiL21hZ2ljc3VnZ2VzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtFQUFBLE1BQU0sQ0FBQyxRQUFQLEdBQWtCLFNBQUMsTUFBRCxFQUFTLEdBQVQsRUFBYyxNQUFkLEVBQXNCLElBQXRCLEVBQTRCLFFBQTVCO0FBQ2hCLFFBQUE7SUFBQSxRQUFBLEdBQVcsUUFBQSxJQUFZLElBQVosSUFBb0I7SUFDL0IsSUFBQSxHQUFPLElBQUEsSUFBUTtJQUNmLElBQUcsU0FBUyxDQUFDLE1BQVYsS0FBb0IsQ0FBdkI7TUFDRSxJQUFBLEdBQU8sT0FEVDs7SUFFQSxJQUFHLFNBQVMsQ0FBQyxNQUFWLEtBQXFCLENBQXhCO01BQ0UsTUFBQSxHQUFTO01BQ1QsSUFBQSxHQUFPLE9BRlQ7O0lBR0EsTUFBQSxHQUFTLE1BQUEsSUFBVTtBQUNuQixTQUFBLFdBQUE7O01BQ0UsSUFBd0IsU0FBeEI7UUFBQSxPQUFPLE1BQU8sQ0FBQSxDQUFBLEVBQWQ7O0FBREY7SUFFQSxTQUFBLEdBQWUsR0FBRyxDQUFDLE1BQUosQ0FBVyxLQUFYLENBQUEsSUFBcUIsQ0FBeEIsR0FBK0IsR0FBL0IsR0FBd0M7V0FDcEQsQ0FBQyxDQUFDLElBQUYs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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsREE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsid2luZG93LmFwaV9jYWxsID0gKG1ldGhvZCwgdXJsLCBwYXJhbXMsIGRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZGF0YSB8fCBwYXJhbXNcclxuICBkYXRhID0gZGF0YSB8fCBwYXJhbXNcclxuICBpZiBhcmd1bWVudHMubGVuZ3RoID09IDRcclxuICAgIGRhdGEgPSB1bmRlZmluZWRcclxuICBpZiBhcmd1bWVudHMubGVuZ3RoID09ICAzXHJcbiAgICBwYXJhbXMgPSB1bmRlZmluZWRcclxuICAgIGRhdGEgPSB1bmRlZmluZWRcclxuICBwYXJhbXMgPSBwYXJhbXMgfHwge31cclxuICBmb3IgaywgdiBvZiBwYXJhbXNcclxuICAgIGRlbGV0ZSBwYXJhbXNba10gaWYgbm90IHY/XHJcbiAgc2VwYXJhdG9yID0gaWYgdXJsLnNlYXJjaCgnXFxcXD8nKSA+PSAwIHRoZW4gJyYnIGVsc2UgJz8nXHJcbiAgJC5hamF4XHJcbiAgICB0eXBlOiBtZXRob2RcclxuICAgIHVybDogXCIje3VybH0je3NlcGFyYXRvcn0jeyQucGFyYW0gcGFyYW1zfVwiXHJcbiAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICBhY2NlcHRzOiAnYXBwbGljYXRpb24vanNvbidcclxuICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgIGRhdGE6IGlmIGRhdGEgdGhlbiBKU09OLnN0cmluZ2lmeShkYXRhKSBlbHNlIHVuZGVmaW5lZFxyXG4gICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgIGlmIGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJ1xyXG4gICAgICAgIG1vcmUgPSB1bmRlZmluZWRcclxuICAgICAgICBpZiBkYXRhLm5leHRfdXJsXHJcbiAgICAgICAgICBtb3JlID0gKGNhbGxiYWNrKSAtPiBhcGlfY2FsbChtZXRob2QsIGRhdGEubmV4dF91cmwsIHt9LCBjYWxsYmFjaylcclxuICAgICAgICBjYWxsYmFjaz8gdW5kZWZpbmVkLCBkYXRhLnJlc3VsdCwgbW9yZVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2s/IGRhdGFcclxuICAgIGVycm9yOiAoanFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duKSAtPlxyXG4gICAgICBlcnJvciA9XHJcbiAgICAgICAgZXJyb3JfY29kZTogJ2FqYXhfZXJyb3InXHJcbiAgICAgICAgdGV4dF9zdGF0dXM6IHRleHRTdGF0dXNcclxuICAgICAgICBlcnJvcl90aHJvd246IGVycm9yVGhyb3duXHJcbiAgICAgICAganFYSFI6IGpxWEhSXHJcbiAgICAgIHRyeVxyXG4gICAgICAgIGVycm9yID0gJC5wYXJzZUpTT04oanFYSFIucmVzcG9uc2VUZXh0KSBpZiBqcVhIUi5yZXNwb25zZVRleHRcclxuICAgICAgY2F0Y2ggZVxyXG4gICAgICAgIGVycm9yID0gZXJyb3JcclxuICAgICAgTE9HICdhcGlfY2FsbCBlcnJvcicsIGVycm9yXHJcbiAgICAgIGNhbGxiYWNrPyBlcnJvclxyXG4iLCIoLT5cclxuICBjbGFzcyB3aW5kb3cuRmlsZVVwbG9hZGVyXHJcbiAgICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zKSAtPlxyXG4gICAgICBAdXBsb2FkX2hhbmRsZXIgPSBAb3B0aW9ucy51cGxvYWRfaGFuZGxlclxyXG4gICAgICBAc2VsZWN0b3IgPSBAb3B0aW9ucy5zZWxlY3RvclxyXG4gICAgICBAZHJvcF9hcmVhID0gQG9wdGlvbnMuZHJvcF9hcmVhXHJcbiAgICAgIEB1cGxvYWRfdXJsID0gQG9wdGlvbnMudXBsb2FkX3VybCBvciBcIi9hcGkvdjEje3dpbmRvdy5sb2NhdGlvbi5wYXRobmFtZX1cIlxyXG4gICAgICBAY29uZmlybV9tZXNzYWdlID0gQG9wdGlvbnMuY29uZmlybV9tZXNzYWdlIG9yICdGaWxlcyBhcmUgc3RpbGwgYmVpbmcgdXBsb2FkZWQuJ1xyXG4gICAgICBAYWxsb3dlZF90eXBlcyA9IEBvcHRpb25zLmFsbG93ZWRfdHlwZXNcclxuICAgICAgQG1heF9zaXplID0gQG9wdGlvbnMubWF4X3NpemVcclxuXHJcbiAgICAgIEBhY3RpdmVfZmlsZXMgPSAwXHJcblxyXG4gICAgICBAc2VsZWN0b3I/LmJpbmQgJ2NoYW5nZScsIChlKSA9PlxyXG4gICAgICAgIEBmaWxlX3NlbGVjdF9oYW5kbGVyKGUpXHJcblxyXG4gICAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxyXG4gICAgICBpZiBAZHJvcF9hcmVhPyBhbmQgeGhyLnVwbG9hZFxyXG4gICAgICAgIEBkcm9wX2FyZWEub24gJ2RyYWdvdmVyJywgQGZpbGVfZHJhZ19ob3ZlclxyXG4gICAgICAgIEBkcm9wX2FyZWEub24gJ2RyYWdsZWF2ZScsIEBmaWxlX2RyYWdfaG92ZXJcclxuICAgICAgICBAZHJvcF9hcmVhLm9uICdkcm9wJywgKGUpID0+XHJcbiAgICAgICAgICBAZmlsZV9zZWxlY3RfaGFuZGxlciBlXHJcbiAgICAgICAgQGRyb3BfYXJlYS5zaG93KClcclxuXHJcbiAgICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9ID0+XHJcbiAgICAgICAgaWYgQGNvbmZpcm1fbWVzc2FnZT8gYW5kIEBhY3RpdmVfZmlsZXMgPiAwXHJcbiAgICAgICAgICByZXR1cm4gQGNvbmZpcm1fbWVzc2FnZVxyXG5cclxuICAgIGZpbGVfZHJhZ19ob3ZlcjogKGUpID0+XHJcbiAgICAgIGlmIG5vdCBAZHJvcF9hcmVhP1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICBpZiBlLnR5cGUgaXMgJ2RyYWdvdmVyJ1xyXG4gICAgICAgIEBkcm9wX2FyZWEuYWRkQ2xhc3MgJ2RyYWctaG92ZXInXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAZHJvcF9hcmVhLnJlbW92ZUNsYXNzICdkcmFnLWhvdmVyJ1xyXG5cclxuICAgIGZpbGVfc2VsZWN0X2hhbmRsZXI6IChlKSA9PlxyXG4gICAgICBAZmlsZV9kcmFnX2hvdmVyKGUpXHJcbiAgICAgIGZpbGVzID0gZS5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlcj8uZmlsZXMgb3IgZS50YXJnZXQ/LmZpbGVzIG9yIGUuZGF0YVRyYW5zZmVyPy5maWxlc1xyXG4gICAgICBpZiBmaWxlcz8ubGVuZ3RoID4gMFxyXG4gICAgICAgIEB1cGxvYWRfZmlsZXMoZmlsZXMpXHJcblxyXG4gICAgdXBsb2FkX2ZpbGVzOiAoZmlsZXMpID0+XHJcbiAgICAgIEBnZXRfdXBsb2FkX3VybHMgZmlsZXMubGVuZ3RoLCAoZXJyb3IsIHVybHMpID0+XHJcbiAgICAgICAgaWYgZXJyb3JcclxuICAgICAgICAgIGNvbnNvbGUubG9nICdFcnJvciBnZXR0aW5nIFVSTHMnLCBlcnJvclxyXG4gICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgQHByb2Nlc3NfZmlsZXMgZmlsZXMsIHVybHMsIDBcclxuXHJcbiAgICBnZXRfdXBsb2FkX3VybHM6IChuLCBjYWxsYmFjaykgPT5cclxuICAgICAgcmV0dXJuIGlmIG4gPD0gMFxyXG4gICAgICBhcGlfY2FsbCAnR0VUJywgQHVwbG9hZF91cmwsIHtjb3VudDogbn0sIChlcnJvciwgcmVzdWx0KSAtPlxyXG4gICAgICAgIGlmIGVycm9yXHJcbiAgICAgICAgICBjYWxsYmFjayBlcnJvclxyXG4gICAgICAgICAgdGhyb3cgZXJyb3JcclxuICAgICAgICBjYWxsYmFjayB1bmRlZmluZWQsIHJlc3VsdFxyXG5cclxuICAgIHByb2Nlc3NfZmlsZXM6IChmaWxlcywgdXJscywgaSkgPT5cclxuICAgICAgcmV0dXJuIGlmIGkgPj0gZmlsZXMubGVuZ3RoXHJcbiAgICAgIEB1cGxvYWRfZmlsZSBmaWxlc1tpXSwgdXJsc1tpXS51cGxvYWRfdXJsLCBAdXBsb2FkX2hhbmRsZXI/LnByZXZpZXcoZmlsZXNbaV0pLCAoKSA9PlxyXG4gICAgICAgIEBwcm9jZXNzX2ZpbGVzIGZpbGVzLCB1cmxzLCBpICsgMSwgQHVwbG9hZF9oYW5kbGVyP1xyXG5cclxuICAgIHVwbG9hZF9maWxlOiAoZmlsZSwgdXJsLCBwcm9ncmVzcywgY2FsbGJhY2spID0+XHJcbiAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXHJcbiAgICAgIGlmIEBhbGxvd2VkX3R5cGVzPy5sZW5ndGggPiAwXHJcbiAgICAgICAgaWYgZmlsZS50eXBlIG5vdCBpbiBAYWxsb3dlZF90eXBlc1xyXG4gICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAnd3JvbmdfdHlwZSdcclxuICAgICAgICAgIGNhbGxiYWNrKClcclxuICAgICAgICAgIHJldHVyblxyXG5cclxuICAgICAgaWYgQG1heF9zaXplP1xyXG4gICAgICAgIGlmIGZpbGUuc2l6ZSA+IEBtYXhfc2l6ZVxyXG4gICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAndG9vX2JpZydcclxuICAgICAgICAgIGNhbGxiYWNrKClcclxuICAgICAgICAgIHJldHVyblxyXG5cclxuICAgICAgIyAkKCcjaW1hZ2UnKS52YWwoZmlsZS5uYW1lKTtcclxuICAgICAgeGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyICdwcm9ncmVzcycsIChldmVudCkgLT5cclxuICAgICAgICBwcm9ncmVzcyBwYXJzZUludCBldmVudC5sb2FkZWQgLyBldmVudC50b3RhbCAqIDEwMC4wXHJcblxyXG4gICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gKGV2ZW50KSA9PlxyXG4gICAgICAgIGlmIHhoci5yZWFkeVN0YXRlID09IDRcclxuICAgICAgICAgIGlmIHhoci5zdGF0dXMgPT0gMjAwXHJcbiAgICAgICAgICAgIHJlc3BvbnNlID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KVxyXG4gICAgICAgICAgICBwcm9ncmVzcyAxMDAuMCwgcmVzcG9uc2UucmVzdWx0XHJcbiAgICAgICAgICAgICMgLy8kKCcjY29udGVudCcpLnZhbCh4aHIucmVzcG9uc2VUZXh0KVxyXG4gICAgICAgICAgICAkKCcjaW1hZ2UnKS52YWwoJCgnI2ltYWdlJykudmFsKCkgICsgcmVzcG9uc2UucmVzdWx0LmlkICsgJzsnKTtcclxuICAgICAgICAgICAgQGFjdGl2ZV9maWxlcyAtPSAxXHJcbiAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHByb2dyZXNzIDAsIHVuZGVmaW5lZCwgJ2Vycm9yJ1xyXG4gICAgICAgICAgICBAYWN0aXZlX2ZpbGVzIC09IDFcclxuXHJcbiAgICAgIHhoci5vcGVuICdQT1NUJywgdXJsLCB0cnVlXHJcbiAgICAgIGRhdGEgPSBuZXcgRm9ybURhdGEoKVxyXG4gICAgICBkYXRhLmFwcGVuZCAnZmlsZScsIGZpbGVcclxuICAgICAgeGhyLnNlbmQgZGF0YVxyXG4gICAgICBjYWxsYmFjaygpXHJcbikoKSIsIndpbmRvdy5MT0cgPSAtPlxyXG4gIGNvbnNvbGU/LmxvZz8gYXJndW1lbnRzLi4uXHJcblxyXG5cclxud2luZG93LmluaXRfY29tbW9uID0gLT5cclxuICBpbml0X2xvYWRpbmdfYnV0dG9uKClcclxuICBpbml0X2NvbmZpcm1fYnV0dG9uKClcclxuICBpbml0X3Bhc3N3b3JkX3Nob3dfYnV0dG9uKClcclxuICBpbml0X3RpbWUoKVxyXG4gIGluaXRfYW5ub3VuY2VtZW50KClcclxuICBpbml0X3Jvd19saW5rKClcclxuXHJcblxyXG53aW5kb3cuaW5pdF9sb2FkaW5nX2J1dHRvbiA9IC0+XHJcbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWxvYWRpbmcnLCAtPlxyXG4gICAgJCh0aGlzKS5idXR0b24gJ2xvYWRpbmcnXHJcblxyXG5cclxud2luZG93LmluaXRfY29uZmlybV9idXR0b24gPSAtPlxyXG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1jb25maXJtJywgLT5cclxuICAgIGlmIG5vdCBjb25maXJtICQodGhpcykuZGF0YSgnbWVzc2FnZScpIG9yICdBcmUgeW91IHN1cmU/J1xyXG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXHJcblxyXG5cclxud2luZG93LmluaXRfcGFzc3dvcmRfc2hvd19idXR0b24gPSAtPlxyXG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1wYXNzd29yZC1zaG93JywgLT5cclxuICAgICR0YXJnZXQgPSAkKCQodGhpcykuZGF0YSAndGFyZ2V0JylcclxuICAgICR0YXJnZXQuZm9jdXMoKVxyXG4gICAgaWYgJCh0aGlzKS5oYXNDbGFzcyAnYWN0aXZlJ1xyXG4gICAgICAkdGFyZ2V0LmF0dHIgJ3R5cGUnLCAncGFzc3dvcmQnXHJcbiAgICBlbHNlXHJcbiAgICAgICR0YXJnZXQuYXR0ciAndHlwZScsICd0ZXh0J1xyXG5cclxuXHJcbndpbmRvdy5pbml0X3RpbWUgPSAtPlxyXG4gIGlmICQoJ3RpbWUnKS5sZW5ndGggPiAwXHJcbiAgICByZWNhbGN1bGF0ZSA9IC0+XHJcbiAgICAgICQoJ3RpbWVbZGF0ZXRpbWVdJykuZWFjaCAtPlxyXG4gICAgICAgIGRhdGUgPSBtb21lbnQudXRjICQodGhpcykuYXR0ciAnZGF0ZXRpbWUnXHJcbiAgICAgICAgZGlmZiA9IG1vbWVudCgpLmRpZmYgZGF0ZSAsICdkYXlzJ1xyXG4gICAgICAgIGlmIGRpZmYgPiAyNVxyXG4gICAgICAgICAgJCh0aGlzKS50ZXh0IGRhdGUubG9jYWwoKS5mb3JtYXQgJ1lZWVktTU0tREQnXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgJCh0aGlzKS50ZXh0IGRhdGUuZnJvbU5vdygpXHJcbiAgICAgICAgJCh0aGlzKS5hdHRyICd0aXRsZScsIGRhdGUubG9jYWwoKS5mb3JtYXQgJ2RkZGQsIE1NTU0gRG8gWVlZWSwgSEg6bW06c3MgWidcclxuICAgICAgc2V0VGltZW91dCBhcmd1bWVudHMuY2FsbGVlLCAxMDAwICogNDVcclxuICAgIHJlY2FsY3VsYXRlKClcclxuXHJcblxyXG53aW5kb3cuaW5pdF9hbm5vdW5jZW1lbnQgPSAtPlxyXG4gICQoJy5hbGVydC1hbm5vdW5jZW1lbnQgYnV0dG9uLmNsb3NlJykuY2xpY2sgLT5cclxuICAgIHNlc3Npb25TdG9yYWdlPy5zZXRJdGVtICdjbG9zZWRBbm5vdW5jZW1lbnQnLCAkKCcuYWxlcnQtYW5ub3VuY2VtZW50JykuaHRtbCgpXHJcblxyXG4gIGlmIHNlc3Npb25TdG9yYWdlPy5nZXRJdGVtKCdjbG9zZWRBbm5vdW5jZW1lbnQnKSAhPSAkKCcuYWxlcnQtYW5ub3VuY2VtZW50JykuaHRtbCgpXHJcbiAgICAkKCcuYWxlcnQtYW5ub3VuY2VtZW50Jykuc2hvdygpXHJcblxyXG5cclxud2luZG93LmluaXRfcm93X2xpbmsgPSAtPlxyXG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLnJvdy1saW5rJywgLT5cclxuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJCh0aGlzKS5kYXRhICdocmVmJ1xyXG5cclxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5ub3QtbGluaycsIChlKSAtPlxyXG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG5cclxuXHJcbndpbmRvdy5jbGVhcl9ub3RpZmljYXRpb25zID0gLT5cclxuICAkKCcjbm90aWZpY2F0aW9ucycpLmVtcHR5KClcclxuXHJcblxyXG53aW5kb3cuc2hvd19ub3RpZmljYXRpb24gPSAobWVzc2FnZSwgY2F0ZWdvcnk9J3dhcm5pbmcnKSAtPlxyXG4gIGNsZWFyX25vdGlmaWNhdGlvbnMoKVxyXG4gIHJldHVybiBpZiBub3QgbWVzc2FnZVxyXG5cclxuICAkKCcjbm90aWZpY2F0aW9ucycpLmFwcGVuZCBcIlwiXCJcclxuICAgICAgPGRpdiBjbGFzcz1cImFsZXJ0IGFsZXJ0LWRpc21pc3NhYmxlIGFsZXJ0LSN7Y2F0ZWdvcnl9XCI+XHJcbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjbG9zZVwiIGRhdGEtZGlzbWlzcz1cImFsZXJ0XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+JnRpbWVzOzwvYnV0dG9uPlxyXG4gICAgICAgICN7bWVzc2FnZX1cclxuICAgICAgPC9kaXY+XHJcbiAgICBcIlwiXCJcclxuXHJcblxyXG53aW5kb3cuc2l6ZV9odW1hbiA9IChuYnl0ZXMpIC0+XHJcbiAgZm9yIHN1ZmZpeCBpbiBbJ0InLCAnS0InLCAnTUInLCAnR0InLCAnVEInXVxyXG4gICAgaWYgbmJ5dGVzIDwgMTAwMFxyXG4gICAgICBpZiBzdWZmaXggPT0gJ0InXHJcbiAgICAgICAgcmV0dXJuIFwiI3tuYnl0ZXN9ICN7c3VmZml4fVwiXHJcbiAgICAgIHJldHVybiBcIiN7cGFyc2VJbnQobmJ5dGVzICogMTApIC8gMTB9ICN7c3VmZml4fVwiXHJcbiAgICBuYnl0ZXMgLz0gMTAyNC4wXHJcbiIsIiQgLT5cclxuICBpbml0X2NvbW1vbigpXHJcblxyXG4kIC0+ICQoJ2h0bWwuYXV0aCcpLmVhY2ggLT5cclxuICBpbml0X2F1dGgoKVxyXG5cclxuJCAtPiAkKCdodG1sLnVzZXItbGlzdCcpLmVhY2ggLT5cclxuICBpbml0X3VzZXJfbGlzdCgpXHJcblxyXG4kIC0+ICQoJ2h0bWwudXNlci1tZXJnZScpLmVhY2ggLT5cclxuICBpbml0X3VzZXJfbWVyZ2UoKVxyXG5cclxuJCAtPiAkKCdodG1sLnJlc291cmNlLWxpc3QnKS5lYWNoIC0+XHJcbiAgaW5pdF9yZXNvdXJjZV9saXN0KClcclxuXHJcbiQgLT4gJCgnaHRtbC5yZXNvdXJjZS12aWV3JykuZWFjaCAtPlxyXG4gIGluaXRfcmVzb3VyY2VfdmlldygpXHJcblxyXG4kIC0+ICQoJ2h0bWwucG9zdC1jcmVhdGUnKS5lYWNoIC0+XHJcbiAgaW5pdF9yZXNvdXJjZV91cGxvYWQoKVxyXG5cclxuJCAtPiAkKCdodG1sLnJlY29tbWVuZGVyLWNyZWF0ZScpLmVhY2ggLT5cclxuICBpbml0X3Jlc291cmNlX3VwbG9hZCgpXHJcblxyXG4iLCJ3aW5kb3cuaW5pdF9hdXRoID0gLT5cclxuICAkKCcucmVtZW1iZXInKS5jaGFuZ2UgLT5cclxuICAgIGJ1dHRvbnMgPSAkKCcuYnRuLXNvY2lhbCcpLnRvQXJyYXkoKS5jb25jYXQgJCgnLmJ0bi1zb2NpYWwtaWNvbicpLnRvQXJyYXkoKVxyXG4gICAgZm9yIGJ1dHRvbiBpbiBidXR0b25zXHJcbiAgICAgIGhyZWYgPSAkKGJ1dHRvbikucHJvcCAnaHJlZidcclxuICAgICAgaWYgJCgnLnJlbWVtYmVyIGlucHV0JykuaXMgJzpjaGVja2VkJ1xyXG4gICAgICAgICQoYnV0dG9uKS5wcm9wICdocmVmJywgXCIje2hyZWZ9JnJlbWVtYmVyPXRydWVcIlxyXG4gICAgICAgICQoJyNyZW1lbWJlcicpLnByb3AgJ2NoZWNrZWQnLCB0cnVlXHJcbiAgICAgIGVsc2VcclxuICAgICAgICAkKGJ1dHRvbikucHJvcCAnaHJlZicsIGhyZWYucmVwbGFjZSAnJnJlbWVtYmVyPXRydWUnLCAnJ1xyXG4gICAgICAgICQoJyNyZW1lbWJlcicpLnByb3AgJ2NoZWNrZWQnLCBmYWxzZVxyXG5cclxuICAkKCcucmVtZW1iZXInKS5jaGFuZ2UoKVxyXG4iLCIjIGh0dHA6Ly9ibG9nLmFub3JnYW4uY29tLzIwMTIvMDkvMzAvcHJldHR5LW11bHRpLWZpbGUtdXBsb2FkLWJvb3RzdHJhcC1qcXVlcnktdHdpZy1zaWxleC9cclxuaWYgJChcIi5wcmV0dHktZmlsZVwiKS5sZW5ndGhcclxuICAkKFwiLnByZXR0eS1maWxlXCIpLmVhY2ggKCkgLT5cclxuICAgIHByZXR0eV9maWxlID0gJCh0aGlzKVxyXG4gICAgZmlsZV9pbnB1dCA9IHByZXR0eV9maWxlLmZpbmQoJ2lucHV0W3R5cGU9XCJmaWxlXCJdJylcclxuICAgIGZpbGVfaW5wdXQuaGlkZSgpXHJcbiAgICBmaWxlX2lucHV0LmNoYW5nZSAoKSAtPlxyXG4gICAgICBmaWxlcyA9IGZpbGVfaW5wdXRbMF0uZmlsZXNcclxuICAgICAgaW5mbyA9IFwiXCJcclxuICAgICAgaWYgZmlsZXMubGVuZ3RoID4gMVxyXG4gICAgICAgIGluZm8gPSBcIiN7ZmlsZXMubGVuZ3RofSBmaWxlcyBzZWxlY3RlZFwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBwYXRoID0gZmlsZV9pbnB1dC52YWwoKS5zcGxpdChcIlxcXFxcIilcclxuICAgICAgICBpbmZvID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdXHJcbiAgICAgIHByZXR0eV9maWxlLmZpbmQoXCIuaW5wdXQtZ3JvdXAgaW5wdXRcIikudmFsKGluZm8pXHJcbiAgICBwcmV0dHlfZmlsZS5maW5kKFwiLmlucHV0LWdyb3VwXCIpLmNsaWNrIChlKSAtPlxyXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgZmlsZV9pbnB1dC5jbGljaygpXHJcbiAgICAgICQodGhpcykuYmx1cigpXHJcbiIsIndpbmRvdy5pbml0X3Jlc291cmNlX2xpc3QgPSAoKSAtPlxyXG4gIGluaXRfZGVsZXRlX3Jlc291cmNlX2J1dHRvbigpXHJcblxyXG53aW5kb3cuaW5pdF9yZXNvdXJjZV92aWV3ID0gKCkgLT5cclxuICBpbml0X2RlbGV0ZV9yZXNvdXJjZV9idXR0b24oKVxyXG5cclxud2luZG93LmluaXRfcmVzb3VyY2VfdXBsb2FkID0gKCkgLT5cclxuXHJcbiAgaWYgd2luZG93LkZpbGUgYW5kIHdpbmRvdy5GaWxlTGlzdCBhbmQgd2luZG93LkZpbGVSZWFkZXJcclxuICAgIHdpbmRvdy5maWxlX3VwbG9hZGVyID0gbmV3IEZpbGVVcGxvYWRlclxyXG4gICAgICB1cGxvYWRfaGFuZGxlcjogdXBsb2FkX2hhbmRsZXJcclxuICAgICAgc2VsZWN0b3I6ICQoJy5maWxlJylcclxuICAgICAgZHJvcF9hcmVhOiAkKCcuZHJvcC1hcmVhJylcclxuICAgICAgY29uZmlybV9tZXNzYWdlOiAnRmlsZXMgYXJlIHN0aWxsIGJlaW5nIHVwbG9hZGVkLidcclxuICAgICAgdXBsb2FkX3VybDogJCgnLmZpbGUnKS5kYXRhKCdnZXQtdXBsb2FkLXVybCcpXHJcbiAgICAgIGFsbG93ZWRfdHlwZXM6IFtdXHJcbiAgICAgIG1heF9zaXplOiAxMDI0ICogMTAyNCAqIDEwMjRcclxuXHJcbnVwbG9hZF9oYW5kbGVyID1cclxuICBwcmV2aWV3OiAoZmlsZSkgLT5cclxuICAgICRyZXNvdXJjZSA9ICQgXCJcIlwiXHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbC1sZy0yIGNvbC1tZC0zIGNvbC1zbS00IGNvbC14cy02XCI+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwidGh1bWJuYWlsXCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmV2aWV3XCI+PC9kaXY+XHJcbiAgICAgICAgICAgIDxoNT4je2ZpbGUubmFtZX08L2g1PlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3NcIj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3MtYmFyXCIgc3R5bGU9XCJ3aWR0aDogMCU7XCI+PC9kaXY+XHJcbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzLXRleHRcIj48L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgXCJcIlwiXHJcbiAgICAkcHJldmlldyA9ICQoJy5wcmV2aWV3JywgJHJlc291cmNlKVxyXG5cclxuICAgIGlmIGZpbGVfdXBsb2FkZXIuYWN0aXZlX2ZpbGVzIDwgMTYgYW5kIGZpbGUudHlwZS5pbmRleE9mKFwiaW1hZ2VcIikgaXMgMFxyXG4gICAgICByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXHJcbiAgICAgIHJlYWRlci5vbmxvYWQgPSAoZSkgPT5cclxuICAgICAgICAkcHJldmlldy5jc3MoJ2JhY2tncm91bmQtaW1hZ2UnLCBcInVybCgje2UudGFyZ2V0LnJlc3VsdH0pXCIpXHJcbiAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKGZpbGUpXHJcbiAgICBlbHNlXHJcbiAgICAgICRwcmV2aWV3LnRleHQoZmlsZS50eXBlIG9yICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nKVxyXG5cclxuICAgICQoJy5yZXNvdXJjZS11cGxvYWRzJykucHJlcGVuZCgkcmVzb3VyY2UpXHJcblxyXG4gICAgKHByb2dyZXNzLCByZXNvdXJjZSwgZXJyb3IpID0+XHJcbiAgICAgIGlmIGVycm9yXHJcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuY3NzKCd3aWR0aCcsICcxMDAlJylcclxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5hZGRDbGFzcygncHJvZ3Jlc3MtYmFyLWRhbmdlcicpXHJcbiAgICAgICAgaWYgZXJyb3IgPT0gJ3Rvb19iaWcnXHJcbiAgICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIkZhaWxlZCEgVG9vIGJpZywgbWF4OiAje3NpemVfaHVtYW4oZmlsZV91cGxvYWRlci5tYXhfc2l6ZSl9LlwiKVxyXG4gICAgICAgIGVsc2UgaWYgZXJyb3IgPT0gJ3dyb25nX3R5cGUnXHJcbiAgICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIkZhaWxlZCEgV3JvbmcgZmlsZSB0eXBlLlwiKVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KCdGYWlsZWQhJylcclxuICAgICAgICByZXR1cm5cclxuXHJcbiAgICAgIGlmIHByb2dyZXNzID09IDEwMC4wIGFuZCByZXNvdXJjZVxyXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmFkZENsYXNzKCdwcm9ncmVzcy1iYXItc3VjY2VzcycpXHJcbiAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCJTdWNjZXNzICN7c2l6ZV9odW1hbihmaWxlLnNpemUpfVwiKVxyXG4gICAgICAgIGlmIHJlc291cmNlLmltYWdlX3VybCBhbmQgJHByZXZpZXcudGV4dCgpLmxlbmd0aCA+IDBcclxuICAgICAgICAgICRwcmV2aWV3LmNzcygnYmFja2dyb3VuZC1pbWFnZScsIFwidXJsKCN7cmVzb3VyY2UuaW1hZ2VfdXJsfSlcIilcclxuICAgICAgICAgICRwcmV2aWV3LnRleHQoJycpXHJcbiAgICAgIGVsc2UgaWYgcHJvZ3Jlc3MgPT0gMTAwLjBcclxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5jc3MoJ3dpZHRoJywgJzEwMCUnKVxyXG4gICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiMTAwJSAtIFByb2Nlc3NpbmcuLlwiKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuY3NzKCd3aWR0aCcsIFwiI3twcm9ncmVzc30lXCIpXHJcbiAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCIje3Byb2dyZXNzfSUgb2YgI3tzaXplX2h1bWFuKGZpbGUuc2l6ZSl9XCIpXHJcblxyXG5cclxud2luZG93LmluaXRfZGVsZXRlX3Jlc291cmNlX2J1dHRvbiA9ICgpIC0+XHJcbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWRlbGV0ZScsIChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBpZiBjb25maXJtKCdQcmVzcyBPSyB0byBkZWxldGUgdGhlIHJlc291cmNlJylcclxuICAgICAgJCh0aGlzKS5hdHRyKCdkaXNhYmxlZCcsICdkaXNhYmxlZCcpXHJcbiAgICAgIGFwaV9jYWxsICdERUxFVEUnLCAkKHRoaXMpLmRhdGEoJ2FwaS11cmwnKSwgKGVyciwgcmVzdWx0KSA9PlxyXG4gICAgICAgIGlmIGVyclxyXG4gICAgICAgICAgJCh0aGlzKS5yZW1vdmVBdHRyKCdkaXNhYmxlZCcpXHJcbiAgICAgICAgICBMT0cgJ1NvbWV0aGluZyB3ZW50IHRlcnJpYmx5IHdyb25nIGR1cmluZyBkZWxldGUhJywgZXJyXHJcbiAgICAgICAgICByZXR1cm5cclxuICAgICAgICB0YXJnZXQgPSAkKHRoaXMpLmRhdGEoJ3RhcmdldCcpXHJcbiAgICAgICAgcmVkaXJlY3RfdXJsID0gJCh0aGlzKS5kYXRhKCdyZWRpcmVjdC11cmwnKVxyXG4gICAgICAgIGlmIHRhcmdldFxyXG4gICAgICAgICAgJChcIiN7dGFyZ2V0fVwiKS5yZW1vdmUoKVxyXG4gICAgICAgIGlmIHJlZGlyZWN0X3VybFxyXG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZWRpcmVjdF91cmwiLCJ3aW5kb3cuaW5pdF91c2VyX2xpc3QgPSAtPlxyXG4gIGluaXRfdXNlcl9zZWxlY3Rpb25zKClcclxuICBpbml0X3VzZXJfZGVsZXRlX2J0bigpXHJcbiAgaW5pdF91c2VyX21lcmdlX2J0bigpXHJcblxyXG5cclxuaW5pdF91c2VyX3NlbGVjdGlvbnMgPSAtPlxyXG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5lYWNoIC0+XHJcbiAgICB1c2VyX3NlbGVjdF9yb3cgJCh0aGlzKVxyXG5cclxuICAkKCcjc2VsZWN0LWFsbCcpLmNoYW5nZSAtPlxyXG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLnByb3AgJ2NoZWNrZWQnLCAkKHRoaXMpLmlzICc6Y2hlY2tlZCdcclxuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5lYWNoIC0+XHJcbiAgICAgIHVzZXJfc2VsZWN0X3JvdyAkKHRoaXMpXHJcblxyXG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5jaGFuZ2UgLT5cclxuICAgIHVzZXJfc2VsZWN0X3JvdyAkKHRoaXMpXHJcblxyXG5cclxudXNlcl9zZWxlY3Rfcm93ID0gKCRlbGVtZW50KSAtPlxyXG4gIHVwZGF0ZV91c2VyX3NlbGVjdGlvbnMoKVxyXG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5lYWNoIC0+XHJcbiAgICBpZCA9ICRlbGVtZW50LnZhbCgpXHJcbiAgICAkKFwiIyN7aWR9XCIpLnRvZ2dsZUNsYXNzICd3YXJuaW5nJywgJGVsZW1lbnQuaXMgJzpjaGVja2VkJ1xyXG5cclxuXHJcbnVwZGF0ZV91c2VyX3NlbGVjdGlvbnMgPSAtPlxyXG4gIHNlbGVjdGVkID0gJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykubGVuZ3RoXHJcbiAgJCgnI3VzZXItYWN0aW9ucycpLnRvZ2dsZUNsYXNzICdoaWRkZW4nLCBzZWxlY3RlZCA9PSAwXHJcbiAgJCgnI3VzZXItbWVyZ2UnKS50b2dnbGVDbGFzcyAnaGlkZGVuJywgc2VsZWN0ZWQgPCAyXHJcbiAgaWYgc2VsZWN0ZWQgaXMgMFxyXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdpbmRldGVybWluYXRlJywgZmFsc2VcclxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnY2hlY2tlZCcsIGZhbHNlXHJcbiAgZWxzZSBpZiAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOm5vdCg6Y2hlY2tlZCknKS5sZW5ndGggaXMgMFxyXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdpbmRldGVybWluYXRlJywgZmFsc2VcclxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnY2hlY2tlZCcsIHRydWVcclxuICBlbHNlXHJcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCB0cnVlXHJcblxyXG5cclxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4jIERlbGV0ZSBVc2VycyBTdHVmZlxyXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbmluaXRfdXNlcl9kZWxldGVfYnRuID0gLT5cclxuICAkKCcjdXNlci1kZWxldGUnKS5jbGljayAoZSkgLT5cclxuICAgIGNsZWFyX25vdGlmaWNhdGlvbnMoKVxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBjb25maXJtX21lc3NhZ2UgPSAoJCh0aGlzKS5kYXRhICdjb25maXJtJykucmVwbGFjZSAne3VzZXJzfScsICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmxlbmd0aFxyXG4gICAgaWYgY29uZmlybSBjb25maXJtX21lc3NhZ2VcclxuICAgICAgdXNlcl9rZXlzID0gW11cclxuICAgICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykuZWFjaCAtPlxyXG4gICAgICAgICQodGhpcykuYXR0ciAnZGlzYWJsZWQnLCB0cnVlXHJcbiAgICAgICAgdXNlcl9rZXlzLnB1c2ggJCh0aGlzKS52YWwoKVxyXG4gICAgICBkZWxldGVfdXJsID0gJCh0aGlzKS5kYXRhICdhcGktdXJsJ1xyXG4gICAgICBzdWNjZXNzX21lc3NhZ2UgPSAkKHRoaXMpLmRhdGEgJ3N1Y2Nlc3MnXHJcbiAgICAgIGVycm9yX21lc3NhZ2UgPSAkKHRoaXMpLmRhdGEgJ2Vycm9yJ1xyXG4gICAgICBhcGlfY2FsbCAnREVMRVRFJywgZGVsZXRlX3VybCwge3VzZXJfa2V5czogdXNlcl9rZXlzLmpvaW4oJywnKX0sIChlcnIsIHJlc3VsdCkgLT5cclxuICAgICAgICBpZiBlcnJcclxuICAgICAgICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl06ZGlzYWJsZWQnKS5yZW1vdmVBdHRyICdkaXNhYmxlZCdcclxuICAgICAgICAgIHNob3dfbm90aWZpY2F0aW9uIGVycm9yX21lc3NhZ2UucmVwbGFjZSgne3VzZXJzfScsIHVzZXJfa2V5cy5sZW5ndGgpLCAnZGFuZ2VyJ1xyXG4gICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgJChcIiMje3Jlc3VsdC5qb2luKCcsICMnKX1cIikuZmFkZU91dCAtPlxyXG4gICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKVxyXG4gICAgICAgICAgdXBkYXRlX3VzZXJfc2VsZWN0aW9ucygpXHJcbiAgICAgICAgICBzaG93X25vdGlmaWNhdGlvbiBzdWNjZXNzX21lc3NhZ2UucmVwbGFjZSgne3VzZXJzfScsIHVzZXJfa2V5cy5sZW5ndGgpLCAnc3VjY2VzcydcclxuXHJcblxyXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiMgTWVyZ2UgVXNlcnMgU3R1ZmZcclxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG53aW5kb3cuaW5pdF91c2VyX21lcmdlID0gLT5cclxuICB1c2VyX2tleXMgPSAkKCcjdXNlcl9rZXlzJykudmFsKClcclxuICBhcGlfdXJsID0gJCgnLmFwaS11cmwnKS5kYXRhICdhcGktdXJsJ1xyXG4gIGFwaV9jYWxsICdHRVQnLCBhcGlfdXJsLCB7dXNlcl9rZXlzOiB1c2VyX2tleXN9LCAoZXJyb3IsIHJlc3VsdCkgLT5cclxuICAgIGlmIGVycm9yXHJcbiAgICAgIExPRyAnU29tZXRoaW5nIHdlbnQgdGVycmlibHkgd3JvbmcnXHJcbiAgICAgIHJldHVyblxyXG4gICAgd2luZG93LnVzZXJfZGJzID0gcmVzdWx0XHJcbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykucmVtb3ZlQXR0ciAnZGlzYWJsZWQnXHJcblxyXG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5jaGFuZ2UgKGV2ZW50KSAtPlxyXG4gICAgdXNlcl9rZXkgPSAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnZhbCgpXHJcbiAgICBzZWxlY3RfZGVmYXVsdF91c2VyIHVzZXJfa2V5XHJcblxyXG5cclxuc2VsZWN0X2RlZmF1bHRfdXNlciA9ICh1c2VyX2tleSkgLT5cclxuICAkKCcudXNlci1yb3cnKS5yZW1vdmVDbGFzcygnc3VjY2VzcycpLmFkZENsYXNzICdkYW5nZXInXHJcbiAgJChcIiMje3VzZXJfa2V5fVwiKS5yZW1vdmVDbGFzcygnZGFuZ2VyJykuYWRkQ2xhc3MgJ3N1Y2Nlc3MnXHJcblxyXG4gIGZvciB1c2VyX2RiIGluIHVzZXJfZGJzXHJcbiAgICBpZiB1c2VyX2tleSA9PSB1c2VyX2RiLmtleVxyXG4gICAgICAkKCdpbnB1dFtuYW1lPXVzZXJfa2V5XScpLnZhbCB1c2VyX2RiLmtleVxyXG4gICAgICAkKCdpbnB1dFtuYW1lPXVzZXJuYW1lXScpLnZhbCB1c2VyX2RiLnVzZXJuYW1lXHJcbiAgICAgICQoJ2lucHV0W25hbWU9bmFtZV0nKS52YWwgdXNlcl9kYi5uYW1lXHJcbiAgICAgICQoJ2lucHV0W25hbWU9ZW1haWxdJykudmFsIHVzZXJfZGIuZW1haWxcclxuICAgICAgYnJlYWtcclxuXHJcblxyXG5pbml0X3VzZXJfbWVyZ2VfYnRuID0gLT5cclxuICAkKCcjdXNlci1tZXJnZScpLmNsaWNrIChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICB1c2VyX2tleXMgPSBbXVxyXG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykuZWFjaCAtPlxyXG4gICAgICB1c2VyX2tleXMucHVzaCAkKHRoaXMpLnZhbCgpXHJcbiAgICB1c2VyX21lcmdlX3VybCA9ICQodGhpcykuZGF0YSAndXNlci1tZXJnZS11cmwnXHJcbiAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFwiI3t1c2VyX21lcmdlX3VybH0/dXNlcl9rZXlzPSN7dXNlcl9rZXlzLmpvaW4oJywnKX1cIlxyXG4iLCJcclxuZnVuY3Rpb24gZm9sbG93RnVuY3Rpb24oeCwgeSkge1xyXG5cclxuICAgIGFwaV91cmwgPSAnL2FwaS92MS9mb2xsb3cvJyArIHkgKyAnLyc7XHJcblxyXG4gICAgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJsYWJlbC1kZWZhdWx0XCIpKXtcclxuICAgICAgICAgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJub3QtbG9nZ2VkLWluXCIpKXtcclxuLy8gICAgICAgICAgICAkKFwiI2xvZ2luZm9ybVwiKS5jc3Moe1widmlzaWJpbGl0eVwiOlwidmlzaWJsZVwiLFwiZGlzcGxheVwiOlwiYmxvY2tcIn0pO1xyXG4gICAgICAgICAgICAkKFwiLnJlY29tbWVuZGVyXCIpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcclxuICAgICAgICAgICAgJChcIiNsb2dpbmZvcm1cIikuZmFkZUluKCk7XHJcbi8vICAgICAgICAgICAgJChcIiNyZXN0YXVyYW50XCIpLmZhZGVPdXQoKTtcclxuICAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgIHguY2xhc3NMaXN0LnJlbW92ZShcImxhYmVsLWRlZmF1bHRcIilcclxuICAgICAgICAgICAgeC5jbGFzc0xpc3QuYWRkKFwibGFiZWwtc3VjY2Vzc1wiKVxyXG4gICAgICAgICAgICB4LmlubmVySFRNTD0nRk9MTE9XSU5HJztcclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBhcGlfdXJsLCAgICAvL1lvdXIgYXBpIHVybFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnUFVUJywgICAvL3R5cGUgaXMgYW55IEhUVFAgbWV0aG9kXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sICAgICAgLy9EYXRhIGFzIGpzIG9iamVjdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIDtcclxuICAgICAgICAgfVxyXG5cclxuICAgIH0gZWxzZSBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcImxhYmVsLXN1Y2Nlc3NcIikpe1xyXG5cclxuICAgICAgICB4LmNsYXNzTGlzdC5yZW1vdmUoXCJsYWJlbC1zdWNjZXNzXCIpXHJcbiAgICAgICAgeC5jbGFzc0xpc3QuYWRkKFwibGFiZWwtZGVmYXVsdFwiKVxyXG4gICAgICAgIHguaW5uZXJIVE1MID0gJ0ZPTExPVyc7XHJcbiAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ0RFTEVURScsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24ocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgO1xyXG4gICAgfVxyXG59XHJcblxyXG4kKFwiI3RvVG9wXCIpLmhpZGUoKTtcclxuJCh3aW5kb3cpLnNjcm9sbChmdW5jdGlvbigpIHtcclxuICBpZiAoJCh3aW5kb3cpLnNjcm9sbFRvcCgpID4gMTUwKSB7ICQoJyN0b1RvcCcpLnNsaWRlRG93bigxNTApOyBcclxuICB9XHJcbiAgaWYgKCQod2luZG93KS5zY3JvbGxUb3AoKSA8IDE1MCkgeyAkKCcjdG9Ub3AnKS5zbGlkZVVwKDE1MCk7IFxyXG4gIH1cclxufSk7XHJcblxyXG53aW5kb3cub25zY3JvbGwgPSBmdW5jdGlvbigpIHtteUZ1bmN0aW9uKCl9O1xyXG5mdW5jdGlvbiBteUZ1bmN0aW9uKCkge1xyXG4gICAgaWYgKGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wID4gMTUwIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3AgPiAxNTApIHtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwibmF2YmFyTGlzdEVsZW1lbnRcIikuY2xhc3NOYW1lID0gXCJ0ZXN0XCI7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJuYXZiYXJMaXN0RWxlbWVudFwiKS5jbGFzc05hbWUgPSBcIlwiO1xyXG4gICAgfVxyXG59XHJcblxyXG4iLCIvLyhmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LGZhY3Rvcnkpe2lmKHR5cGVvZiBleHBvcnRzPT09XCJvYmplY3RcIiYmdHlwZW9mIG1vZHVsZT09PVwib2JqZWN0XCIpbW9kdWxlLmV4cG9ydHM9ZmFjdG9yeSgpO2Vsc2UgaWYodHlwZW9mIGRlZmluZT09PVwiZnVuY3Rpb25cIiYmZGVmaW5lLmFtZClkZWZpbmUoXCJHaWZmZmVyXCIsW10sZmFjdG9yeSk7ZWxzZSBpZih0eXBlb2YgZXhwb3J0cz09PVwib2JqZWN0XCIpZXhwb3J0c1tcIkdpZmZmZXJcIl09ZmFjdG9yeSgpO2Vsc2Ugcm9vdFtcIkdpZmZmZXJcIl09ZmFjdG9yeSgpfSkodGhpcyxmdW5jdGlvbigpe3ZhciBkPWRvY3VtZW50O3ZhciBwbGF5U2l6ZT02MDt2YXIgR2lmZmZlcj1mdW5jdGlvbihvcHRpb25zKXt2YXIgaW1hZ2VzLGk9MCxnaWZzPVtdO2ltYWdlcz1kLnF1ZXJ5U2VsZWN0b3JBbGwoXCJbZGF0YS1naWZmZmVyXVwiKTtmb3IoO2k8aW1hZ2VzLmxlbmd0aDsrK2kpcHJvY2VzcyhpbWFnZXNbaV0sZ2lmcyxvcHRpb25zKTtyZXR1cm4gZ2lmc307ZnVuY3Rpb24gZm9ybWF0VW5pdCh2KXtyZXR1cm4gdisodi50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjA/XCJcIjpcInB4XCIpfWZ1bmN0aW9uIHBhcnNlU3R5bGVzKHN0eWxlcyl7dmFyIHN0eWxlc1N0cj1cIlwiO2Zvcihwcm9wIGluIHN0eWxlcylzdHlsZXNTdHIrPXByb3ArXCI6XCIrc3R5bGVzW3Byb3BdK1wiO1wiO3JldHVybiBzdHlsZXNTdHJ9ZnVuY3Rpb24gY3JlYXRlQ29udGFpbmVyKHcsaCxlbCxhbHRUZXh0LG9wdHMpe3ZhciBhbHQ7dmFyIGNvbj1kLmNyZWF0ZUVsZW1lbnQoXCJCVVRUT05cIik7dmFyIGNscz1lbC5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKTt2YXIgaWQ9ZWwuZ2V0QXR0cmlidXRlKFwiaWRcIik7dmFyIHBsYXlCdXR0b25TdHlsZXM9b3B0cyYmb3B0cy5wbGF5QnV0dG9uU3R5bGVzP3BhcnNlU3R5bGVzKG9wdHMucGxheUJ1dHRvblN0eWxlcyk6W1wid2lkdGg6XCIrcGxheVNpemUrXCJweFwiLFwiaGVpZ2h0OlwiK3BsYXlTaXplK1wicHhcIixcImJvcmRlci1yYWRpdXM6XCIrcGxheVNpemUvMitcInB4XCIsXCJiYWNrZ3JvdW5kOnJnYmEoMCwgMCwgMCwgMC4zKVwiLFwicG9zaXRpb246YWJzb2x1dGVcIixcInRvcDo1MCVcIixcImxlZnQ6NTAlXCIsXCJtYXJnaW46LVwiK3BsYXlTaXplLzIrXCJweFwiXS5qb2luKFwiO1wiKTt2YXIgcGxheUJ1dHRvbkljb25TdHlsZXM9b3B0cyYmb3B0cy5wbGF5QnV0dG9uSWNvblN0eWxlcz9wYXJzZVN0eWxlcyhvcHRzLnBsYXlCdXR0b25JY29uU3R5bGVzKTpbXCJ3aWR0aDogMFwiLFwiaGVpZ2h0OiAwXCIsXCJib3JkZXItdG9wOiAxNHB4IHNvbGlkIHRyYW5zcGFyZW50XCIsXCJib3JkZXItYm90dG9tOiAxNHB4IHNvbGlkIHRyYW5zcGFyZW50XCIsXCJib3JkZXItbGVmdDogMTRweCBzb2xpZCByZ2JhKDAsIDAsIDAsIDAuNSlcIixcInBvc2l0aW9uOiBhYnNvbHV0ZVwiLFwibGVmdDogMjZweFwiLFwidG9wOiAxNnB4XCJdLmpvaW4oXCI7XCIpO2Nscz9jb24uc2V0QXR0cmlidXRlKFwiY2xhc3NcIixlbC5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKSk6bnVsbDtpZD9jb24uc2V0QXR0cmlidXRlKFwiaWRcIixlbC5nZXRBdHRyaWJ1dGUoXCJpZFwiKSk6bnVsbDtjb24uc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInBvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO2JhY2tncm91bmQ6bm9uZTtib3JkZXI6bm9uZTtwYWRkaW5nOjA7XCIpO2Nvbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWhpZGRlblwiLFwidHJ1ZVwiKTt2YXIgcGxheT1kLmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7cGxheS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLFwiZ2lmZmZlci1wbGF5LWJ1dHRvblwiKTtwbGF5LnNldEF0dHJpYnV0ZShcInN0eWxlXCIscGxheUJ1dHRvblN0eWxlcyk7dmFyIHRybmdsPWQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTt0cm5nbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLHBsYXlCdXR0b25JY29uU3R5bGVzKTtwbGF5LmFwcGVuZENoaWxkKHRybmdsKTtpZihhbHRUZXh0KXthbHQ9ZC5jcmVhdGVFbGVtZW50KFwicFwiKTthbHQuc2V0QXR0cmlidXRlKFwiY2xhc3NcIixcImdpZmZmZXItYWx0XCIpO2FsdC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwiYm9yZGVyOjA7Y2xpcDpyZWN0KDAgMCAwIDApO2hlaWdodDoxcHg7b3ZlcmZsb3c6aGlkZGVuO3BhZGRpbmc6MDtwb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxcHg7XCIpO2FsdC5pbm5lclRleHQ9YWx0VGV4dCtcIiwgaW1hZ2VcIn1jb24uYXBwZW5kQ2hpbGQocGxheSk7ZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoY29uLGVsKTthbHRUZXh0P2Nvbi5wYXJlbnROb2RlLmluc2VydEJlZm9yZShhbHQsY29uLm5leHRTaWJsaW5nKTpudWxsO3JldHVybntjOmNvbixwOnBsYXl9fWZ1bmN0aW9uIGNhbGN1bGF0ZVBlcmNlbnRhZ2VEaW0oZWwsdyxoLHdPcmlnLGhPcmlnKXt2YXIgcGFyZW50RGltVz1lbC5wYXJlbnROb2RlLm9mZnNldFdpZHRoO3ZhciBwYXJlbnREaW1IPWVsLnBhcmVudE5vZGUub2Zmc2V0SGVpZ2h0O3ZhciByYXRpbz13T3JpZy9oT3JpZztpZih3LnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCl7dz1wYXJzZUludCh3LnRvU3RyaW5nKCkucmVwbGFjZShcIiVcIixcIlwiKSk7dz13LzEwMCpwYXJlbnREaW1XO2g9dy9yYXRpb31lbHNlIGlmKGgudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wKXtoPXBhcnNlSW50KGgudG9TdHJpbmcoKS5yZXBsYWNlKFwiJVwiLFwiXCIpKTtoPWgvMTAwKnBhcmVudERpbVc7dz1oL3JhdGlvfXJldHVybnt3OncsaDpofX1mdW5jdGlvbiBwcm9jZXNzKGVsLGdpZnMsb3B0aW9ucyl7dmFyIHVybCxjb24sYyx3LGgsZHVyYXRpb24scGxheSxnaWYscGxheWluZz1mYWxzZSxjYyxpc0MsZHVyYXRpb25UaW1lb3V0LGRpbXMsYWx0VGV4dDt1cmw9ZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1naWZmZmVyXCIpO3c9ZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1naWZmZmVyLXdpZHRoXCIpO2g9ZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1naWZmZmVyLWhlaWdodFwiKTtkdXJhdGlvbj1lbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWdpZmZmZXItZHVyYXRpb25cIik7YWx0VGV4dD1lbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWdpZmZmZXItYWx0XCIpO2VsLnN0eWxlLmRpc3BsYXk9XCJibG9ja1wiO2M9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtpc0M9ISEoYy5nZXRDb250ZXh0JiZjLmdldENvbnRleHQoXCIyZFwiKSk7aWYodyYmaCYmaXNDKWNjPWNyZWF0ZUNvbnRhaW5lcih3LGgsZWwsYWx0VGV4dCxvcHRpb25zKTtlbC5vbmxvYWQ9ZnVuY3Rpb24oKXtpZighaXNDKXJldHVybjt3PXd8fGVsLndpZHRoO2g9aHx8ZWwuaGVpZ2h0O2lmKCFjYyljYz1jcmVhdGVDb250YWluZXIodyxoLGVsLGFsdFRleHQsb3B0aW9ucyk7Y29uPWNjLmM7cGxheT1jYy5wO2RpbXM9Y2FsY3VsYXRlUGVyY2VudGFnZURpbShjb24sdyxoLGVsLndpZHRoLGVsLmhlaWdodCk7Z2lmcy5wdXNoKGNvbik7Y29uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLGZ1bmN0aW9uKCl7Y2xlYXJUaW1lb3V0KGR1cmF0aW9uVGltZW91dCk7aWYoIXBsYXlpbmcpe3BsYXlpbmc9dHJ1ZTtnaWY9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIklNR1wiKTtnaWYuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcIndpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7XCIpO2dpZi5zZXRBdHRyaWJ1dGUoXCJkYXRhLXVyaVwiLE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoxZTUpKzEpO3NldFRpbWVvdXQoZnVuY3Rpb24oKXtnaWYuc3JjPXVybH0sMCk7Y29uLnJlbW92ZUNoaWxkKHBsYXkpO2Nvbi5yZW1vdmVDaGlsZChjKTtjb24uYXBwZW5kQ2hpbGQoZ2lmKTtpZihwYXJzZUludChkdXJhdGlvbik+MCl7ZHVyYXRpb25UaW1lb3V0PXNldFRpbWVvdXQoZnVuY3Rpb24oKXtwbGF5aW5nPWZhbHNlO2Nvbi5hcHBlbmRDaGlsZChwbGF5KTtjb24ucmVtb3ZlQ2hpbGQoZ2lmKTtjb24uYXBwZW5kQ2hpbGQoYyk7Z2lmPW51bGx9LGR1cmF0aW9uKX19ZWxzZXtwbGF5aW5nPWZhbHNlO2Nvbi5hcHBlbmRDaGlsZChwbGF5KTtjb24ucmVtb3ZlQ2hpbGQoZ2lmKTtjb24uYXBwZW5kQ2hpbGQoYyk7Z2lmPW51bGx9fSk7Yy53aWR0aD1kaW1zLnc7Yy5oZWlnaHQ9ZGltcy5oO2MuZ2V0Q29udGV4dChcIjJkXCIpLmRyYXdJbWFnZShlbCwwLDAsZGltcy53LGRpbXMuaCk7Y29uLmFwcGVuZENoaWxkKGMpO2Nvbi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwicG9zaXRpb246cmVsYXRpdmU7Y3Vyc29yOnBvaW50ZXI7d2lkdGg6XCIrZGltcy53K1wicHg7aGVpZ2h0OlwiK2RpbXMuaCtcInB4O2JhY2tncm91bmQ6bm9uZTtib3JkZXI6bm9uZTtwYWRkaW5nOjA7XCIpO2Muc3R5bGUud2lkdGg9XCIxMDAlXCI7Yy5zdHlsZS5oZWlnaHQ9XCIxMDAlXCI7aWYody50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjAmJmgudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wKXtjb24uc3R5bGUud2lkdGg9dztjb24uc3R5bGUuaGVpZ2h0PWh9ZWxzZSBpZih3LnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCl7Y29uLnN0eWxlLndpZHRoPXc7Y29uLnN0eWxlLmhlaWdodD1cImluaGVyaXRcIn1lbHNlIGlmKGgudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wKXtjb24uc3R5bGUud2lkdGg9XCJpbmhlcml0XCI7Y29uLnN0eWxlLmhlaWdodD1ofWVsc2V7Y29uLnN0eWxlLndpZHRoPWRpbXMudytcInB4XCI7Y29uLnN0eWxlLmhlaWdodD1kaW1zLmgrXCJweFwifX07ZWwuc3JjPXVybH1yZXR1cm4gR2lmZmZlcn0pO1xyXG4iLCIvLyBGb2xsb3dpbmcgY29kZSBhZGRzIHR5cGVhaGVhZCBrZXl3b3JkcyB0byBzZWFyY2ggYmFyc1xyXG5cclxudmFyIGtleXdvcmRzID0gbmV3IEJsb29kaG91bmQoe1xyXG4gICAgZGF0dW1Ub2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy5vYmoud2hpdGVzcGFjZSgnbmFtZScpLFxyXG4gICAgcXVlcnlUb2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy53aGl0ZXNwYWNlLFxyXG4gICAgcHJlZmV0Y2g6IHtcclxuICAgIHVybDogJy9rZXl3b3JkcycsXHJcbiAgICBmaWx0ZXI6IGZ1bmN0aW9uKGxpc3QpIHtcclxuICAgICAgcmV0dXJuICQubWFwKGxpc3QsIGZ1bmN0aW9uKGNpdHluYW1lKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgbmFtZTogY2l0eW5hbWUgfTsgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxufSk7XHJcblxyXG5rZXl3b3Jkcy5pbml0aWFsaXplKCk7XHJcblxyXG4kKCcjc2VhcmNoJykudHlwZWFoZWFkKG51bGwsIHtcclxuICAgICBtaW5sZW5ndGg6IDEsXHJcbiAgICAgbmFtZTogJ2tleXdvcmRzJyxcclxuICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXHJcbiAgICAgdmFsdWVLZXk6ICduYW1lJyxcclxuICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXHJcbn0pO1xyXG5cclxuJCgnI3NlYXJjaF9wYWdlJykudHlwZWFoZWFkKG51bGwsIHtcclxuICAgICBtaW5sZW5ndGg6IDEsXHJcbiAgICAgbmFtZTogJ2tleXdvcmRzJyxcclxuICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXHJcbiAgICAgdmFsdWVLZXk6ICduYW1lJyxcclxuICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXHJcbn0pO1xyXG5cclxuXHJcblxyXG4kKCcja2V5d29yZHMnKS50YWdzaW5wdXQoe1xyXG4gICAgY29uZmlybUtleXM6IFsxMywgNDRdLFxyXG4gICAgdHlwZWFoZWFkanM6IFt7XHJcbiAgICAgICAgICBtaW5MZW5ndGg6IDEsXHJcbiAgICAgICAgICBoaWdobGlnaHQ6IHRydWUsXHJcblxyXG4gICAgfSx7XHJcbiAgICAgICAgbWlubGVuZ3RoOiAxLFxyXG4gICAgICAgIG5hbWU6ICdrZXl3b3JkcycsXHJcbiAgICAgICAgZGlzcGxheUtleTogJ25hbWUnLFxyXG4gICAgICAgIHZhbHVlS2V5OiAnbmFtZScsXHJcbiAgICAgICAgc291cmNlOiBrZXl3b3Jkcy50dEFkYXB0ZXIoKVxyXG4gICAgfV0sXHJcbiAgICBmcmVlSW5wdXQ6IHRydWUsXHJcblxyXG59KTtcclxuXHJcbiQoJyNsb2NhdGlvbl9rZXl3b3JkcycpLnRhZ3NpbnB1dCh7XHJcbiAgICBjb25maXJtS2V5czogWzEzLCA0NF0sXHJcbiAgICB0eXBlYWhlYWRqczogW3tcclxuICAgICAgICAgIG1pbkxlbmd0aDogMSxcclxuICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZSxcclxuXHJcbiAgICB9LHtcclxuICAgICAgICBtaW5sZW5ndGg6IDEsXHJcbiAgICAgICAgbmFtZTogJ2tleXdvcmRzJyxcclxuICAgICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXHJcbiAgICAgICAgdmFsdWVLZXk6ICduYW1lJyxcclxuICAgICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXHJcbiAgICB9XSxcclxuICAgIGZyZWVJbnB1dDogdHJ1ZSxcclxuXHJcbn0pO1xyXG5cclxuJCgnLmRyYWFpa25vcGplJykuY2xpY2soZnVuY3Rpb24gKCkge1xyXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAkKCcuZ3JpZCcpLm1hc29ucnkoJ2xheW91dCcpO1xyXG4gIH0sIDEwMCk7XHJcbn0pO1xyXG5cclxuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XHJcbiAgR2lmZmZlcih7XHJcbiAgICAgIHBsYXlCdXR0b25TdHlsZXM6IHtcclxuICAgICAgICAnd2lkdGgnOiAnNjBweCcsXHJcbiAgICAgICAgJ2hlaWdodCc6ICc2MHB4JyxcclxuICAgICAgICAnYm9yZGVyLXJhZGl1cyc6ICczMHB4JyxcclxuICAgICAgICAnYmFja2dyb3VuZCc6ICdyZ2JhKDAsIDAsIDAsIDAuMyknLFxyXG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXHJcbiAgICAgICAgJ3RvcCc6ICc1MCUnLFxyXG4gICAgICAgICdsZWZ0JzogJzUwJScsXHJcbiAgICAgICAgJ21hcmdpbic6ICctMzBweCAwIDAgLTMwcHgnXHJcbiAgICAgIH0sXHJcbiAgICAgIHBsYXlCdXR0b25JY29uU3R5bGVzOiB7XHJcbiAgICAgICAgJ3dpZHRoJzogJzAnLFxyXG4gICAgICAgICdoZWlnaHQnOiAnMCcsXHJcbiAgICAgICAgJ2JvcmRlci10b3AnOiAnMTRweCBzb2xpZCB0cmFuc3BhcmVudCcsXHJcbiAgICAgICAgJ2JvcmRlci1ib3R0b20nOiAnMTRweCBzb2xpZCB0cmFuc3BhcmVudCcsXHJcbiAgICAgICAgJ2JvcmRlci1sZWZ0JzogJzE0cHggc29saWQgcmdiYSgyNTUsMjU1LDI1NSwgMC41KScsXHJcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcclxuICAgICAgICAnbGVmdCc6ICcyNnB4JyxcclxuICAgICAgICAndG9wJzogJzE2cHgnXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgICQoJy5ncmlkJykubWFzb25yeSh7XHJcbiAgICAgIGl0ZW1TZWxlY3RvcjogJy5ncmlkLWl0ZW0nLCAvLyB1c2UgYSBzZXBhcmF0ZSBjbGFzcyBmb3IgaXRlbVNlbGVjdG9yLCBvdGhlciB0aGFuIC5jb2wtXHJcbiAgICAgIGNvbHVtbldpZHRoOiAnLmdyaWQtc2l6ZXInLFxyXG4gICAgICBwZXJjZW50UG9zaXRpb246IHRydWVcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGxheW91dCBNYXNvbnJ5IGFmdGVyIGVhY2ggaW1hZ2UgbG9hZHNcclxuICAgICQoJy5ncmlkJykuaW1hZ2VzTG9hZGVkKCkucHJvZ3Jlc3MoIGZ1bmN0aW9uKCkge1xyXG4gICAgICAkKCcuZ3JpZCcpLm1hc29ucnkoJ2xheW91dCcpO1xyXG4gICAgfSk7XHJcblxyXG4gfSlcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuZnVuY3Rpb24gZXNjYXBlSFRNTChzdHJpbmcpIHtcclxuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvJi9nLCcmYW1wOycpLnJlcGxhY2UoLzwvZywnJmx0OycpLnJlcGxhY2UoLz4vZywnJmd0OycpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDbGVhbk5hbWUoZmVhdHVyZSwgcHJvcGVydHkpe1xyXG4gICAgLy9yZXR1cm4gc3RyaW5nIHN0aXBwZWQgb2YgaHRtbCBjb2Rlc1xyXG4gICAgcmV0dXJuIGVzY2FwZUhUTUwoZmVhdHVyZS5nZXRQcm9wZXJ0eShwcm9wZXJ0eSkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRLZXl3b3JkVXJscyhtYWluVXJsLCBrZXl3b3JkQXJyYXkpe1xyXG4gICAgLy8gUmV0dXJucyBhIHN0cmluZyBvZiBodG1sIGxpbmtzIGJhc2VkIG9uIGFycmF5IG9mIGtleXdvcmRzXHJcbiAgICB2YXIgcmVzdWx0ID0gJyc7XHJcbiAgICB2YXIgYUxlbiA9IE1hdGgubWluKDMsICBrZXl3b3JkQXJyYXkubGVuZ3RoKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYUxlbjsgaSsrKSB7XHJcbiAgICAgIGh0bWwgPSBbXHJcbiAgICAgICAgJzxhIGNsYXNzPVwidGh1bWJuYWlsSGFzaHRhZ1wiIGhyZWY9XCInICsgbWFpblVybCArIGtleXdvcmRBcnJheVtpXSArICdcIj4nLFxyXG4gICAgICAgICAgICAnIycgKyBrZXl3b3JkQXJyYXlbaV0sXHJcbiAgICAgICAgICc8L2E+J1xyXG4gICAgICBdLmpvaW4oXCJcXG5cIik7XHJcbiAgICAgIHJlc3VsdCArPSBodG1sO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlQm94KGZlYXR1cmUpe1xyXG4gLy8gR2VuZXJhdGVzIHRoZSBIVE1MIGNvZGUgZm9yIHRoZSBtYXAgaW5mbyB3aW5kb3dcclxuIHZhciBzZWFyY2hfcGFnZV91cmwgPSAnL3Bvc3QvcS8nO1xyXG5cclxuIHZhciBuYW1lID0gZ2V0Q2xlYW5OYW1lKGZlYXR1cmUsICduYW1lJyk7XHJcbiB2YXIgZGVzY3JpcHRpb24gPSBnZXRDbGVhbk5hbWUoZmVhdHVyZSwgJ2Rlc2NyaXB0aW9uJyk7XHJcbiB2YXIgaW1hZ2VfdXJsID0gZ2V0Q2xlYW5OYW1lKGZlYXR1cmUsICdpbWFnZV91cmwnKTtcclxuIHZhciBsb2NhdGlvbl9rZXl3b3JkID0gZ2V0Q2xlYW5OYW1lKGZlYXR1cmUsICdsb2NhdGlvbicpO1xyXG4gdmFyIGtleXdvcmRzID0gZ2V0Q2xlYW5OYW1lKGZlYXR1cmUsICdrZXl3b3JkcycpLnNwbGl0KCcsJyk7XHJcbiB2YXIgcmVjb21tZW5kZXIgPSBnZXRDbGVhbk5hbWUoZmVhdHVyZSwgJ3JlY29tbWVuZGVyJyk7XHJcbiB2YXIgZG9jaWQgPSBnZXRDbGVhbk5hbWUoZmVhdHVyZSwgJ2RvY2lkJyk7XHJcbiB2YXIgd2Vic2l0ZSA9IGdldENsZWFuTmFtZShmZWF0dXJlLCAnd2Vic2l0ZScpO1xyXG4gdmFyIGFkZHJlc3MgPSBnZXRDbGVhbk5hbWUoZmVhdHVyZSwgJ2FkZHJlc3MnKTtcclxuXHJcblxyXG4gdmFyIGxvY2F0aW9uX3VybCA9IHNlYXJjaF9wYWdlX3VybCArIGxvY2F0aW9uX2tleXdvcmQ7XHJcbiB2YXIga2V5d29yZF91cmxzID0gZ2V0S2V5d29yZFVybHMoc2VhcmNoX3BhZ2VfdXJsLCBrZXl3b3Jkcyk7XHJcbiB2YXIgcmVjb21tZW5kZXJfdXJsID0gc2VhcmNoX3BhZ2VfdXJsICsgJ3JlY29tbWVuZGVyPScgKyByZWNvbW1lbmRlci5yZXBsYWNlKCcsJywgJycpO1xyXG4gdmFyIGdvb2dsZV9tYXBzX2RpcmVjdGlvbnMgPSAnaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9tYXBzP3NhZGRyPU15K0xvY2F0aW9uJmRhZGRyPScgKyBhZGRyZXNzLnJlcGxhY2UoJyAnLCAnKycpO1xyXG5cclxuIHZhciBodG1sID0gW1xyXG4gJzxkaXYgY2xhc3M9XCJib3hcIiBzdHlsZT1cIm1heC13aWR0aDozMDBweDtcIj4nLFxyXG4gICAgXHJcbiAgICAvLyBpbWFnZVxyXG4gICAgJzxpbWcgY2xhc3M9XCJpbWctZmx1aWRcIiBkYXRhLWdpZmZmZXI9XCInICsgaW1hZ2VfdXJsICsgJ1wiPicsXHJcblxyXG4gICAgLy8gc3RhcnQgYWNjb3JkaW9uXHJcbiAgICAnPGRpdiBjbGFzcz1cInRhYlwiPicsXHJcblxyXG4gICAgLy8gaWNvbiBsaXN0XHJcbiAgICAnPGlucHV0IGlkPVwiJyArIGRvY2lkICsgJ1wiIGNsYXNzPVwiaGlkZGVuIGRyYWFpa25vcGplXCIgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cInRhYnNcIj4nLFxyXG4gICAgICAgIFxyXG4gICAgICAnPGxhYmVsIGZvcj1cIicgKyBkb2NpZCArICdcIj4nLFxyXG5cclxuICAgICAgICAvLyBuYW1lIHNwb3RcclxuICAgICAgICAnPHVsIGNsYXNzPVwiYWRkaXRpb25hbExpbmtzXCIgc3R5bGU9XCJtYXJnaW4tbGVmdDowcHg7cGFkZGluZy1sZWZ0OjBweDtcIj4nLFxyXG4gICAgICAgICc8bGkgY2xhc3M9XCJpY29uTGlzdFwiPicsXHJcbiAgICAgICAgICAgICc8aDEgY2xhc3M9XCJ0aHVtYm5haWxUaXRsZVwiPicgKyBuYW1lICsgJzwvaDE+JyxcclxuICAgICAgICAgICAgLy8gbGluayByZWNvbW1lbmRlclxyXG4gICAgICAgICAgICAnPGEgY2xhc3M9XCJsaW5rUmVjb21tZW5kZWRCeVwiIGhyZWY9XCInICsgcmVjb21tZW5kZXJfdXJsICsgJ1wiPiBCWSAnICsgcmVjb21tZW5kZXIgKyAnPC9hPicsXHJcbiAgICAgICAgICc8L2xpPicsXHJcbiAgICAgICAgJzwvdWw+JyxcclxuICAgICAgICBcclxuICAgICAgJzwvbGFiZWw+JyxcclxuICAgICAgICBcclxuICAgICAgLy8gY29udGVudCBhY2NvcmRpb25cclxuICAgICAgJzxkaXYgY2xhc3M9XCJ0YWItY29udGVudFwiPicsXHJcbiAgICAgICAgJzxwIGNsYXNzPVwicExlZnRcIj4nICsgZGVzY3JpcHRpb24gKyAnPC9wPicsXHJcbiAgICAgICc8L2Rpdj4nLFxyXG5cclxuICAgICAgLy8gZW5kIGFjY29yZGlvblxyXG4gICAgICAnPC9kaXY+JyxcclxuXHJcbiAgICAgIC8vIGxvY2F0aW9uXHJcbiAgICAgICc8ZGl2IGNsYXNzPVwidGFiNFwiPicsXHJcbiAgICAgICc8aSBjbGFzcz1cImZhIGZhLW1hcC1waW5cIiBzdHlsZT1cImZvbnQtc2l6ZToxMnB4OyBwYWRkaW5nOiA1cHggMHB4IDVweCA1cHg7IGNvbG9yOiNFRUVFRUU7XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9pPicsXHJcbiAgICAgICc8YSBjbGFzcz1cInRodW1ibmFpbExvY2F0aW9uXCIgaHJlZj1cIicgKyBsb2NhdGlvbl91cmwgKyAnXCI+JyxcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uX2tleXdvcmQsXHJcbiAgICAgICc8L2E+JyxcclxuICAgICAgJzwvZGl2PicsXHJcbiAgICAgICBcclxuICAgICAgLy8gbGluayBoYXNodGFnc1xyXG4gICAgICAnPGRpdiBjbGFzcz1cInRhYjRcIj4nLFxyXG4gICAgICAnPGkgY2xhc3M9XCJmYSBmYS10YWdcIiBzdHlsZT1cImZvbnQtc2l6ZToxMnB4OyBwYWRkaW5nOiA1cHggMHB4IDVweCA1cHg7IGNvbG9yOiNFRUVFRUU7XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9pPicsXHJcbiAgICAgICc8YSBjbGFzcz1cInRodW1ibmFpbExvY2F0aW9uXCI+JyArIGtleXdvcmRfdXJscyArIFxyXG4gICAgICAnPC9hPicsXHJcbiAgICAgICc8L2Rpdj4nLFxyXG4gICAgXHJcblxyXG4gICAgICAvLyBleHRlcm5hbCB3ZWJzaXRlXHJcbiAgICAgICc8ZGl2IGNsYXNzPVwidGFiNFwiPicsXHJcbiAgICAgICc8aSBjbGFzcz1cImZhIGZhLW1hcC1zaWduc1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIHN0eWxlPVwiZm9udC1zaXplOjEycHg7IHBhZGRpbmc6IDVweCAwcHggNXB4IDVweDsgY29sb3I6I0VFRUVFRTtcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L2k+JyxcclxuICAgICAgICAgICc8YSBjbGFzcz1cInRodW1ibmFpbExvY2F0aW9uXCIgaHJlZj1cIicgKyB3ZWJzaXRlICsgJ1wiPicsJzwvYT4nLFxyXG4gICAgICAnPC9kaXY+JyxcclxuXHJcbiAgICAgIC8vIGRpcmVjdGlvblxyXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGFiNFwiID4nLFxyXG4gICAgICAgICc8aSBjbGFzcz1cImZhIGZhLWV4dGVybmFsLWxpbmtcIiBzdHlsZT1cImZvbnQtc2l6ZToxMnB4OyBwYWRkaW5nOiA1cHggMHB4IDVweCA1cHg7IGNvbG9yOiNFRUVFRUU7XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9pPicsXHJcbiAgICAgICAgJzxhIGNsYXNzPVwidGh1bWJuYWlsTG9jYXRpb25cIiBocmVmPVwiJyArIGFkZHJlc3MgKyAnXCI+JywnPC9hPicsXHJcbiAgICAgICAgJzwvZGl2PicsXHJcblxyXG4gICAgICAnPC9kaXY+JyxcclxuICc8L2Rpdj4nXHJcbiAgXTtcclxuIHJldHVybiBodG1sLmpvaW4oXCJcXG5cIik7XHJcblxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gcHJvY2Vzc1BvaW50cyhnZW9tZXRyeSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcclxuICBpZiAoZ2VvbWV0cnkgaW5zdGFuY2VvZiBnb29nbGUubWFwcy5MYXRMbmcpIHtcclxuICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgZ2VvbWV0cnkpO1xyXG4gIH0gZWxzZSBpZiAoZ2VvbWV0cnkgaW5zdGFuY2VvZiBnb29nbGUubWFwcy5EYXRhLlBvaW50KSB7XHJcbiAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIGdlb21ldHJ5LmdldCgpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgZ2VvbWV0cnkuZ2V0QXJyYXkoKS5mb3JFYWNoKGZ1bmN0aW9uIChnKSB7XHJcbiAgICAgIHByb2Nlc3NQb2ludHMoZywgY2FsbGJhY2ssIHRoaXNBcmcpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0TWFwKCkge1xyXG4gIC8vIENyZWF0ZSB0aGUgbWFwLlxyXG4gIHZhciBtYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ21hcCcpWzBdLCB7XHJcbiAgICB6b29tOiA3LFxyXG4gICAgY2VudGVyOiB7IGxhdDogMCwgbG5nOiAwIH0sXHJcbiAgfSk7XHJcblxyXG4gIHZhciBib3VuZHMgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nQm91bmRzKCk7XHJcbiAgbWFwLmRhdGEuYWRkTGlzdGVuZXIoJ2FkZGZlYXR1cmUnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgcHJvY2Vzc1BvaW50cyhlLmZlYXR1cmUuZ2V0R2VvbWV0cnkoKSwgYm91bmRzLmV4dGVuZCwgYm91bmRzKTtcclxuXHJcbiAgICBpZiAoYm91bmRzLmdldE5vcnRoRWFzdCgpLmVxdWFscyhib3VuZHMuZ2V0U291dGhXZXN0KCkpKSB7XHJcbiAgICAgICB2YXIgZXh0ZW5kUG9pbnQxID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhib3VuZHMuZ2V0Tm9ydGhFYXN0KCkubGF0KCkgKyAwLjAxLCBib3VuZHMuZ2V0Tm9ydGhFYXN0KCkubG5nKCkgKyAwLjAxKTtcclxuICAgICAgIHZhciBleHRlbmRQb2ludDIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGJvdW5kcy5nZXROb3J0aEVhc3QoKS5sYXQoKSAtIDAuMDEsIGJvdW5kcy5nZXROb3J0aEVhc3QoKS5sbmcoKSAtIDAuMDEpO1xyXG4gICAgICAgYm91bmRzLmV4dGVuZChleHRlbmRQb2ludDEpO1xyXG4gICAgICAgYm91bmRzLmV4dGVuZChleHRlbmRQb2ludDIpO1xyXG4gICAgfVxyXG5cclxuICAgIG1hcC5maXRCb3VuZHMoYm91bmRzKTtcclxuICB9KTtcclxuICBjb25zb2xlLmxvZyhxdWVyeSk7XHJcblxyXG4gIGFwaV91cmwgPSAnL2FwaS92MS9wb3N0LycgKyBxdWVyeTtcclxuICAvLyBMb2FkIHRoZSBzdG9yZXMgR2VvSlNPTiBvbnRvIHRoZSBtYXAuXHJcbiAgbWFwLmRhdGEubG9hZEdlb0pzb24oYXBpX3VybCk7XHJcblxyXG4gIHZhciBhcGlLZXkgPSAnQUl6YVN5QWJjTUdNVUxncDVsMFRyYXYyRzNPc2VJck5HSXhIRFprJztcclxuICB2YXIgaW5mb1dpbmRvdyA9IG5ldyBnb29nbGUubWFwcy5JbmZvV2luZG93KCk7XHJcbiAgaW5mb1dpbmRvdy5zZXRPcHRpb25zKHsgcGl4ZWxPZmZzZXQ6IG5ldyBnb29nbGUubWFwcy5TaXplKDAsIC0zMCkgfSk7XHJcblxyXG4gIC8vIFNob3cgdGhlIGluZm9ybWF0aW9uIGZvciBhIHN0b3JlIHdoZW4gaXRzIG1hcmtlciBpcyBjbGlja2VkLlxyXG4gIG1hcC5kYXRhLmFkZExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gIHZhciBwb3NpdGlvbiA9IGV2ZW50LmZlYXR1cmUuZ2V0R2VvbWV0cnkoKS5nZXQoKTtcclxuICB2YXIgY29udGVudCA9IGdlbmVyYXRlQm94KGV2ZW50LmZlYXR1cmUpO1xyXG5cclxuICBpbmZvV2luZG93LnNldENvbnRlbnQoY29udGVudCk7XHJcbiAgaW5mb1dpbmRvdy5zZXRQb3NpdGlvbihwb3NpdGlvbik7XHJcblxyXG4gIGluZm9XaW5kb3cub3BlbihtYXApO1xyXG5cclxuICAgR2lmZmZlcih7XHJcbiAgICAgIHBsYXlCdXR0b25TdHlsZXM6IHtcclxuICAgICAgICAnd2lkdGgnOiAnNjBweCcsXHJcbiAgICAgICAgJ2hlaWdodCc6ICc2MHB4JyxcclxuICAgICAgICAnYm9yZGVyLXJhZGl1cyc6ICczMHB4JyxcclxuICAgICAgICAnYmFja2dyb3VuZCc6ICdyZ2JhKDAsIDAsIDAsIDAuMyknLFxyXG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXHJcbiAgICAgICAgJ3RvcCc6ICc1MCUnLFxyXG4gICAgICAgICdsZWZ0JzogJzUwJScsXHJcbiAgICAgICAgJ21hcmdpbic6ICctMzBweCAwIDAgLTMwcHgnXHJcbiAgICAgIH0sXHJcbiAgICAgIHBsYXlCdXR0b25JY29uU3R5bGVzOiB7XHJcbiAgICAgICAgJ3dpZHRoJzogJzAnLFxyXG4gICAgICAgICdoZWlnaHQnOiAnMCcsXHJcbiAgICAgICAgJ2JvcmRlci10b3AnOiAnMTRweCBzb2xpZCB0cmFuc3BhcmVudCcsXHJcbiAgICAgICAgJ2JvcmRlci1ib3R0b20nOiAnMTRweCBzb2xpZCB0cmFuc3BhcmVudCcsXHJcbiAgICAgICAgJ2JvcmRlci1sZWZ0JzogJzE0cHggc29saWQgcmdiYSgyNTUsMjU1LDI1NSwgMC41KScsXHJcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcclxuICAgICAgICAnbGVmdCc6ICcyNnB4JyxcclxuICAgICAgICAndG9wJzogJzE2cHgnXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICB9KTtcclxufVxyXG5cclxuJCgnLm1hcF9saW5rJykub24oJ2NsaWNrJyxmdW5jdGlvbigpIHtcclxuICAkKFwiI3Jlc3RhdXJhbnRcIikuY3NzKHtcImRpc3BsYXlcIjpcIm5vbmVcIn0pO1xyXG5cclxuICAkKFwiI21hcFwiKS5mYWRlSW4oKTtcclxuICBpbml0TWFwKCk7XHJcbiAgJChcImEubGlzdGFcIikuY3NzKHtcImNvbG9yXCI6XCJncmF5XCJ9KTtcclxuICAkKFwiYS5tYXBhXCIpLmNzcyh7XCJjb2xvclwiOlwiYmxhY2tcIn0pO1xyXG5cclxuXHJcbn0pXHJcblxyXG4kKCcubGlzdF9saW5rJykub24oJ2NsaWNrJyxmdW5jdGlvbigpIHtcclxuICAkKFwiI21hcFwiKS5jc3Moe1wiZGlzcGxheVwiOlwibm9uZVwifSk7XHJcbiAgJChcIiNyZXN0YXVyYW50XCIpLmZhZGVJbigpO1xyXG5cclxuICAkKFwiYS5saXN0YVwiKS5jc3Moe1wiY29sb3JcIjpcImJsYWNrXCJ9KTtcclxuICAkKFwiYS5tYXBhXCIpLmNzcyh7XCJjb2xvclwiOlwiZ3JheVwifSk7XHJcblxyXG59KVxyXG5cclxuXHJcbiIsIi8qIVxyXG4gKiBNYXNvbnJ5IFBBQ0tBR0VEIHY0LjIuMFxyXG4gKiBDYXNjYWRpbmcgZ3JpZCBsYXlvdXQgbGlicmFyeVxyXG4gKiBodHRwOi8vbWFzb25yeS5kZXNhbmRyby5jb21cclxuICogTUlUIExpY2Vuc2VcclxuICogYnkgRGF2aWQgRGVTYW5kcm9cclxuICovXHJcblxyXG4hZnVuY3Rpb24odCxlKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwianF1ZXJ5LWJyaWRnZXQvanF1ZXJ5LWJyaWRnZXRcIixbXCJqcXVlcnlcIl0sZnVuY3Rpb24oaSl7cmV0dXJuIGUodCxpKX0pOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUodCxyZXF1aXJlKFwianF1ZXJ5XCIpKTp0LmpRdWVyeUJyaWRnZXQ9ZSh0LHQualF1ZXJ5KX0od2luZG93LGZ1bmN0aW9uKHQsZSl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gaShpLHIsYSl7ZnVuY3Rpb24gaCh0LGUsbil7dmFyIG8scj1cIiQoKS5cIitpKycoXCInK2UrJ1wiKSc7cmV0dXJuIHQuZWFjaChmdW5jdGlvbih0LGgpe3ZhciB1PWEuZGF0YShoLGkpO2lmKCF1KXJldHVybiB2b2lkIHMoaStcIiBub3QgaW5pdGlhbGl6ZWQuIENhbm5vdCBjYWxsIG1ldGhvZHMsIGkuZS4gXCIrcik7dmFyIGQ9dVtlXTtpZighZHx8XCJfXCI9PWUuY2hhckF0KDApKXJldHVybiB2b2lkIHMocitcIiBpcyBub3QgYSB2YWxpZCBtZXRob2RcIik7dmFyIGw9ZC5hcHBseSh1LG4pO289dm9pZCAwPT09bz9sOm99KSx2b2lkIDAhPT1vP286dH1mdW5jdGlvbiB1KHQsZSl7dC5lYWNoKGZ1bmN0aW9uKHQsbil7dmFyIG89YS5kYXRhKG4saSk7bz8oby5vcHRpb24oZSksby5faW5pdCgpKToobz1uZXcgcihuLGUpLGEuZGF0YShuLGksbykpfSl9YT1hfHxlfHx0LmpRdWVyeSxhJiYoci5wcm90b3R5cGUub3B0aW9ufHwoci5wcm90b3R5cGUub3B0aW9uPWZ1bmN0aW9uKHQpe2EuaXNQbGFpbk9iamVjdCh0KSYmKHRoaXMub3B0aW9ucz1hLmV4dGVuZCghMCx0aGlzLm9wdGlvbnMsdCkpfSksYS5mbltpXT1mdW5jdGlvbih0KXtpZihcInN0cmluZ1wiPT10eXBlb2YgdCl7dmFyIGU9by5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gaCh0aGlzLHQsZSl9cmV0dXJuIHUodGhpcyx0KSx0aGlzfSxuKGEpKX1mdW5jdGlvbiBuKHQpeyF0fHx0JiZ0LmJyaWRnZXR8fCh0LmJyaWRnZXQ9aSl9dmFyIG89QXJyYXkucHJvdG90eXBlLnNsaWNlLHI9dC5jb25zb2xlLHM9XCJ1bmRlZmluZWRcIj09dHlwZW9mIHI/ZnVuY3Rpb24oKXt9OmZ1bmN0aW9uKHQpe3IuZXJyb3IodCl9O3JldHVybiBuKGV8fHQualF1ZXJ5KSxpfSksZnVuY3Rpb24odCxlKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwiZXYtZW1pdHRlci9ldi1lbWl0dGVyXCIsZSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZSgpOnQuRXZFbWl0dGVyPWUoKX0oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIHdpbmRvdz93aW5kb3c6dGhpcyxmdW5jdGlvbigpe2Z1bmN0aW9uIHQoKXt9dmFyIGU9dC5wcm90b3R5cGU7cmV0dXJuIGUub249ZnVuY3Rpb24odCxlKXtpZih0JiZlKXt2YXIgaT10aGlzLl9ldmVudHM9dGhpcy5fZXZlbnRzfHx7fSxuPWlbdF09aVt0XXx8W107cmV0dXJuLTE9PW4uaW5kZXhPZihlKSYmbi5wdXNoKGUpLHRoaXN9fSxlLm9uY2U9ZnVuY3Rpb24odCxlKXtpZih0JiZlKXt0aGlzLm9uKHQsZSk7dmFyIGk9dGhpcy5fb25jZUV2ZW50cz10aGlzLl9vbmNlRXZlbnRzfHx7fSxuPWlbdF09aVt0XXx8e307cmV0dXJuIG5bZV09ITAsdGhpc319LGUub2ZmPWZ1bmN0aW9uKHQsZSl7dmFyIGk9dGhpcy5fZXZlbnRzJiZ0aGlzLl9ldmVudHNbdF07aWYoaSYmaS5sZW5ndGgpe3ZhciBuPWkuaW5kZXhPZihlKTtyZXR1cm4tMSE9biYmaS5zcGxpY2UobiwxKSx0aGlzfX0sZS5lbWl0RXZlbnQ9ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLl9ldmVudHMmJnRoaXMuX2V2ZW50c1t0XTtpZihpJiZpLmxlbmd0aCl7dmFyIG49MCxvPWlbbl07ZT1lfHxbXTtmb3IodmFyIHI9dGhpcy5fb25jZUV2ZW50cyYmdGhpcy5fb25jZUV2ZW50c1t0XTtvOyl7dmFyIHM9ciYmcltvXTtzJiYodGhpcy5vZmYodCxvKSxkZWxldGUgcltvXSksby5hcHBseSh0aGlzLGUpLG4rPXM/MDoxLG89aVtuXX1yZXR1cm4gdGhpc319LHR9KSxmdW5jdGlvbih0LGUpe1widXNlIHN0cmljdFwiO1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJnZXQtc2l6ZS9nZXQtc2l6ZVwiLFtdLGZ1bmN0aW9uKCl7cmV0dXJuIGUoKX0pOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUoKTp0LmdldFNpemU9ZSgpfSh3aW5kb3csZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiB0KHQpe3ZhciBlPXBhcnNlRmxvYXQodCksaT0tMT09dC5pbmRleE9mKFwiJVwiKSYmIWlzTmFOKGUpO3JldHVybiBpJiZlfWZ1bmN0aW9uIGUoKXt9ZnVuY3Rpb24gaSgpe2Zvcih2YXIgdD17d2lkdGg6MCxoZWlnaHQ6MCxpbm5lcldpZHRoOjAsaW5uZXJIZWlnaHQ6MCxvdXRlcldpZHRoOjAsb3V0ZXJIZWlnaHQ6MH0sZT0wO3U+ZTtlKyspe3ZhciBpPWhbZV07dFtpXT0wfXJldHVybiB0fWZ1bmN0aW9uIG4odCl7dmFyIGU9Z2V0Q29tcHV0ZWRTdHlsZSh0KTtyZXR1cm4gZXx8YShcIlN0eWxlIHJldHVybmVkIFwiK2UrXCIuIEFyZSB5b3UgcnVubmluZyB0aGlzIGNvZGUgaW4gYSBoaWRkZW4gaWZyYW1lIG9uIEZpcmVmb3g/IFNlZSBodHRwOi8vYml0Lmx5L2dldHNpemVidWcxXCIpLGV9ZnVuY3Rpb24gbygpe2lmKCFkKXtkPSEwO3ZhciBlPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7ZS5zdHlsZS53aWR0aD1cIjIwMHB4XCIsZS5zdHlsZS5wYWRkaW5nPVwiMXB4IDJweCAzcHggNHB4XCIsZS5zdHlsZS5ib3JkZXJTdHlsZT1cInNvbGlkXCIsZS5zdHlsZS5ib3JkZXJXaWR0aD1cIjFweCAycHggM3B4IDRweFwiLGUuc3R5bGUuYm94U2l6aW5nPVwiYm9yZGVyLWJveFwiO3ZhciBpPWRvY3VtZW50LmJvZHl8fGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtpLmFwcGVuZENoaWxkKGUpO3ZhciBvPW4oZSk7ci5pc0JveFNpemVPdXRlcj1zPTIwMD09dChvLndpZHRoKSxpLnJlbW92ZUNoaWxkKGUpfX1mdW5jdGlvbiByKGUpe2lmKG8oKSxcInN0cmluZ1wiPT10eXBlb2YgZSYmKGU9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlKSksZSYmXCJvYmplY3RcIj09dHlwZW9mIGUmJmUubm9kZVR5cGUpe3ZhciByPW4oZSk7aWYoXCJub25lXCI9PXIuZGlzcGxheSlyZXR1cm4gaSgpO3ZhciBhPXt9O2Eud2lkdGg9ZS5vZmZzZXRXaWR0aCxhLmhlaWdodD1lLm9mZnNldEhlaWdodDtmb3IodmFyIGQ9YS5pc0JvcmRlckJveD1cImJvcmRlci1ib3hcIj09ci5ib3hTaXppbmcsbD0wO3U+bDtsKyspe3ZhciBjPWhbbF0sZj1yW2NdLG09cGFyc2VGbG9hdChmKTthW2NdPWlzTmFOKG0pPzA6bX12YXIgcD1hLnBhZGRpbmdMZWZ0K2EucGFkZGluZ1JpZ2h0LGc9YS5wYWRkaW5nVG9wK2EucGFkZGluZ0JvdHRvbSx5PWEubWFyZ2luTGVmdCthLm1hcmdpblJpZ2h0LHY9YS5tYXJnaW5Ub3ArYS5tYXJnaW5Cb3R0b20sXz1hLmJvcmRlckxlZnRXaWR0aCthLmJvcmRlclJpZ2h0V2lkdGgsej1hLmJvcmRlclRvcFdpZHRoK2EuYm9yZGVyQm90dG9tV2lkdGgsRT1kJiZzLGI9dChyLndpZHRoKTtiIT09ITEmJihhLndpZHRoPWIrKEU/MDpwK18pKTt2YXIgeD10KHIuaGVpZ2h0KTtyZXR1cm4geCE9PSExJiYoYS5oZWlnaHQ9eCsoRT8wOmcreikpLGEuaW5uZXJXaWR0aD1hLndpZHRoLShwK18pLGEuaW5uZXJIZWlnaHQ9YS5oZWlnaHQtKGcreiksYS5vdXRlcldpZHRoPWEud2lkdGgreSxhLm91dGVySGVpZ2h0PWEuaGVpZ2h0K3YsYX19dmFyIHMsYT1cInVuZGVmaW5lZFwiPT10eXBlb2YgY29uc29sZT9lOmZ1bmN0aW9uKHQpe2NvbnNvbGUuZXJyb3IodCl9LGg9W1wicGFkZGluZ0xlZnRcIixcInBhZGRpbmdSaWdodFwiLFwicGFkZGluZ1RvcFwiLFwicGFkZGluZ0JvdHRvbVwiLFwibWFyZ2luTGVmdFwiLFwibWFyZ2luUmlnaHRcIixcIm1hcmdpblRvcFwiLFwibWFyZ2luQm90dG9tXCIsXCJib3JkZXJMZWZ0V2lkdGhcIixcImJvcmRlclJpZ2h0V2lkdGhcIixcImJvcmRlclRvcFdpZHRoXCIsXCJib3JkZXJCb3R0b21XaWR0aFwiXSx1PWgubGVuZ3RoLGQ9ITE7cmV0dXJuIHJ9KSxmdW5jdGlvbih0LGUpe1widXNlIHN0cmljdFwiO1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJkZXNhbmRyby1tYXRjaGVzLXNlbGVjdG9yL21hdGNoZXMtc2VsZWN0b3JcIixlKTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKCk6dC5tYXRjaGVzU2VsZWN0b3I9ZSgpfSh3aW5kb3csZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjt2YXIgdD1mdW5jdGlvbigpe3ZhciB0PXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZTtpZih0Lm1hdGNoZXMpcmV0dXJuXCJtYXRjaGVzXCI7aWYodC5tYXRjaGVzU2VsZWN0b3IpcmV0dXJuXCJtYXRjaGVzU2VsZWN0b3JcIjtmb3IodmFyIGU9W1wid2Via2l0XCIsXCJtb3pcIixcIm1zXCIsXCJvXCJdLGk9MDtpPGUubGVuZ3RoO2krKyl7dmFyIG49ZVtpXSxvPW4rXCJNYXRjaGVzU2VsZWN0b3JcIjtpZih0W29dKXJldHVybiBvfX0oKTtyZXR1cm4gZnVuY3Rpb24oZSxpKXtyZXR1cm4gZVt0XShpKX19KSxmdW5jdGlvbih0LGUpe1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJmaXp6eS11aS11dGlscy91dGlsc1wiLFtcImRlc2FuZHJvLW1hdGNoZXMtc2VsZWN0b3IvbWF0Y2hlcy1zZWxlY3RvclwiXSxmdW5jdGlvbihpKXtyZXR1cm4gZSh0LGkpfSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZSh0LHJlcXVpcmUoXCJkZXNhbmRyby1tYXRjaGVzLXNlbGVjdG9yXCIpKTp0LmZpenp5VUlVdGlscz1lKHQsdC5tYXRjaGVzU2VsZWN0b3IpfSh3aW5kb3csZnVuY3Rpb24odCxlKXt2YXIgaT17fTtpLmV4dGVuZD1mdW5jdGlvbih0LGUpe2Zvcih2YXIgaSBpbiBlKXRbaV09ZVtpXTtyZXR1cm4gdH0saS5tb2R1bG89ZnVuY3Rpb24odCxlKXtyZXR1cm4odCVlK2UpJWV9LGkubWFrZUFycmF5PWZ1bmN0aW9uKHQpe3ZhciBlPVtdO2lmKEFycmF5LmlzQXJyYXkodCkpZT10O2Vsc2UgaWYodCYmXCJvYmplY3RcIj09dHlwZW9mIHQmJlwibnVtYmVyXCI9PXR5cGVvZiB0Lmxlbmd0aClmb3IodmFyIGk9MDtpPHQubGVuZ3RoO2krKyllLnB1c2godFtpXSk7ZWxzZSBlLnB1c2godCk7cmV0dXJuIGV9LGkucmVtb3ZlRnJvbT1mdW5jdGlvbih0LGUpe3ZhciBpPXQuaW5kZXhPZihlKTstMSE9aSYmdC5zcGxpY2UoaSwxKX0saS5nZXRQYXJlbnQ9ZnVuY3Rpb24odCxpKXtmb3IoO3QhPWRvY3VtZW50LmJvZHk7KWlmKHQ9dC5wYXJlbnROb2RlLGUodCxpKSlyZXR1cm4gdH0saS5nZXRRdWVyeUVsZW1lbnQ9ZnVuY3Rpb24odCl7cmV0dXJuXCJzdHJpbmdcIj09dHlwZW9mIHQ/ZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0KTp0fSxpLmhhbmRsZUV2ZW50PWZ1bmN0aW9uKHQpe3ZhciBlPVwib25cIit0LnR5cGU7dGhpc1tlXSYmdGhpc1tlXSh0KX0saS5maWx0ZXJGaW5kRWxlbWVudHM9ZnVuY3Rpb24odCxuKXt0PWkubWFrZUFycmF5KHQpO3ZhciBvPVtdO3JldHVybiB0LmZvckVhY2goZnVuY3Rpb24odCl7aWYodCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KXtpZighbilyZXR1cm4gdm9pZCBvLnB1c2godCk7ZSh0LG4pJiZvLnB1c2godCk7Zm9yKHZhciBpPXQucXVlcnlTZWxlY3RvckFsbChuKSxyPTA7cjxpLmxlbmd0aDtyKyspby5wdXNoKGlbcl0pfX0pLG99LGkuZGVib3VuY2VNZXRob2Q9ZnVuY3Rpb24odCxlLGkpe3ZhciBuPXQucHJvdG90eXBlW2VdLG89ZStcIlRpbWVvdXRcIjt0LnByb3RvdHlwZVtlXT1mdW5jdGlvbigpe3ZhciB0PXRoaXNbb107dCYmY2xlYXJUaW1lb3V0KHQpO3ZhciBlPWFyZ3VtZW50cyxyPXRoaXM7dGhpc1tvXT1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7bi5hcHBseShyLGUpLGRlbGV0ZSByW29dfSxpfHwxMDApfX0saS5kb2NSZWFkeT1mdW5jdGlvbih0KXt2YXIgZT1kb2N1bWVudC5yZWFkeVN0YXRlO1wiY29tcGxldGVcIj09ZXx8XCJpbnRlcmFjdGl2ZVwiPT1lP3NldFRpbWVvdXQodCk6ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIix0KX0saS50b0Rhc2hlZD1mdW5jdGlvbih0KXtyZXR1cm4gdC5yZXBsYWNlKC8oLikoW0EtWl0pL2csZnVuY3Rpb24odCxlLGkpe3JldHVybiBlK1wiLVwiK2l9KS50b0xvd2VyQ2FzZSgpfTt2YXIgbj10LmNvbnNvbGU7cmV0dXJuIGkuaHRtbEluaXQ9ZnVuY3Rpb24oZSxvKXtpLmRvY1JlYWR5KGZ1bmN0aW9uKCl7dmFyIHI9aS50b0Rhc2hlZChvKSxzPVwiZGF0YS1cIityLGE9ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIltcIitzK1wiXVwiKSxoPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuanMtXCIrciksdT1pLm1ha2VBcnJheShhKS5jb25jYXQoaS5tYWtlQXJyYXkoaCkpLGQ9cytcIi1vcHRpb25zXCIsbD10LmpRdWVyeTt1LmZvckVhY2goZnVuY3Rpb24odCl7dmFyIGkscj10LmdldEF0dHJpYnV0ZShzKXx8dC5nZXRBdHRyaWJ1dGUoZCk7dHJ5e2k9ciYmSlNPTi5wYXJzZShyKX1jYXRjaChhKXtyZXR1cm4gdm9pZChuJiZuLmVycm9yKFwiRXJyb3IgcGFyc2luZyBcIitzK1wiIG9uIFwiK3QuY2xhc3NOYW1lK1wiOiBcIithKSl9dmFyIGg9bmV3IGUodCxpKTtsJiZsLmRhdGEodCxvLGgpfSl9KX0saX0pLGZ1bmN0aW9uKHQsZSl7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShcIm91dGxheWVyL2l0ZW1cIixbXCJldi1lbWl0dGVyL2V2LWVtaXR0ZXJcIixcImdldC1zaXplL2dldC1zaXplXCJdLGUpOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUocmVxdWlyZShcImV2LWVtaXR0ZXJcIikscmVxdWlyZShcImdldC1zaXplXCIpKToodC5PdXRsYXllcj17fSx0Lk91dGxheWVyLkl0ZW09ZSh0LkV2RW1pdHRlcix0LmdldFNpemUpKX0od2luZG93LGZ1bmN0aW9uKHQsZSl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gaSh0KXtmb3IodmFyIGUgaW4gdClyZXR1cm4hMTtyZXR1cm4gZT1udWxsLCEwfWZ1bmN0aW9uIG4odCxlKXt0JiYodGhpcy5lbGVtZW50PXQsdGhpcy5sYXlvdXQ9ZSx0aGlzLnBvc2l0aW9uPXt4OjAseTowfSx0aGlzLl9jcmVhdGUoKSl9ZnVuY3Rpb24gbyh0KXtyZXR1cm4gdC5yZXBsYWNlKC8oW0EtWl0pL2csZnVuY3Rpb24odCl7cmV0dXJuXCItXCIrdC50b0xvd2VyQ2FzZSgpfSl9dmFyIHI9ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLHM9XCJzdHJpbmdcIj09dHlwZW9mIHIudHJhbnNpdGlvbj9cInRyYW5zaXRpb25cIjpcIldlYmtpdFRyYW5zaXRpb25cIixhPVwic3RyaW5nXCI9PXR5cGVvZiByLnRyYW5zZm9ybT9cInRyYW5zZm9ybVwiOlwiV2Via2l0VHJhbnNmb3JtXCIsaD17V2Via2l0VHJhbnNpdGlvbjpcIndlYmtpdFRyYW5zaXRpb25FbmRcIix0cmFuc2l0aW9uOlwidHJhbnNpdGlvbmVuZFwifVtzXSx1PXt0cmFuc2Zvcm06YSx0cmFuc2l0aW9uOnMsdHJhbnNpdGlvbkR1cmF0aW9uOnMrXCJEdXJhdGlvblwiLHRyYW5zaXRpb25Qcm9wZXJ0eTpzK1wiUHJvcGVydHlcIix0cmFuc2l0aW9uRGVsYXk6cytcIkRlbGF5XCJ9LGQ9bi5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZSh0LnByb3RvdHlwZSk7ZC5jb25zdHJ1Y3Rvcj1uLGQuX2NyZWF0ZT1mdW5jdGlvbigpe3RoaXMuX3RyYW5zbj17aW5nUHJvcGVydGllczp7fSxjbGVhbjp7fSxvbkVuZDp7fX0sdGhpcy5jc3Moe3Bvc2l0aW9uOlwiYWJzb2x1dGVcIn0pfSxkLmhhbmRsZUV2ZW50PWZ1bmN0aW9uKHQpe3ZhciBlPVwib25cIit0LnR5cGU7dGhpc1tlXSYmdGhpc1tlXSh0KX0sZC5nZXRTaXplPWZ1bmN0aW9uKCl7dGhpcy5zaXplPWUodGhpcy5lbGVtZW50KX0sZC5jc3M9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5lbGVtZW50LnN0eWxlO2Zvcih2YXIgaSBpbiB0KXt2YXIgbj11W2ldfHxpO2Vbbl09dFtpXX19LGQuZ2V0UG9zaXRpb249ZnVuY3Rpb24oKXt2YXIgdD1nZXRDb21wdXRlZFN0eWxlKHRoaXMuZWxlbWVudCksZT10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luTGVmdFwiKSxpPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJvcmlnaW5Ub3BcIiksbj10W2U/XCJsZWZ0XCI6XCJyaWdodFwiXSxvPXRbaT9cInRvcFwiOlwiYm90dG9tXCJdLHI9dGhpcy5sYXlvdXQuc2l6ZSxzPS0xIT1uLmluZGV4T2YoXCIlXCIpP3BhcnNlRmxvYXQobikvMTAwKnIud2lkdGg6cGFyc2VJbnQobiwxMCksYT0tMSE9by5pbmRleE9mKFwiJVwiKT9wYXJzZUZsb2F0KG8pLzEwMCpyLmhlaWdodDpwYXJzZUludChvLDEwKTtzPWlzTmFOKHMpPzA6cyxhPWlzTmFOKGEpPzA6YSxzLT1lP3IucGFkZGluZ0xlZnQ6ci5wYWRkaW5nUmlnaHQsYS09aT9yLnBhZGRpbmdUb3A6ci5wYWRkaW5nQm90dG9tLHRoaXMucG9zaXRpb24ueD1zLHRoaXMucG9zaXRpb24ueT1hfSxkLmxheW91dFBvc2l0aW9uPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5sYXlvdXQuc2l6ZSxlPXt9LGk9dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcIm9yaWdpbkxlZnRcIiksbj10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luVG9wXCIpLG89aT9cInBhZGRpbmdMZWZ0XCI6XCJwYWRkaW5nUmlnaHRcIixyPWk/XCJsZWZ0XCI6XCJyaWdodFwiLHM9aT9cInJpZ2h0XCI6XCJsZWZ0XCIsYT10aGlzLnBvc2l0aW9uLngrdFtvXTtlW3JdPXRoaXMuZ2V0WFZhbHVlKGEpLGVbc109XCJcIjt2YXIgaD1uP1wicGFkZGluZ1RvcFwiOlwicGFkZGluZ0JvdHRvbVwiLHU9bj9cInRvcFwiOlwiYm90dG9tXCIsZD1uP1wiYm90dG9tXCI6XCJ0b3BcIixsPXRoaXMucG9zaXRpb24ueSt0W2hdO2VbdV09dGhpcy5nZXRZVmFsdWUobCksZVtkXT1cIlwiLHRoaXMuY3NzKGUpLHRoaXMuZW1pdEV2ZW50KFwibGF5b3V0XCIsW3RoaXNdKX0sZC5nZXRYVmFsdWU9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcImhvcml6b250YWxcIik7cmV0dXJuIHRoaXMubGF5b3V0Lm9wdGlvbnMucGVyY2VudFBvc2l0aW9uJiYhZT90L3RoaXMubGF5b3V0LnNpemUud2lkdGgqMTAwK1wiJVwiOnQrXCJweFwifSxkLmdldFlWYWx1ZT1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwiaG9yaXpvbnRhbFwiKTtyZXR1cm4gdGhpcy5sYXlvdXQub3B0aW9ucy5wZXJjZW50UG9zaXRpb24mJmU/dC90aGlzLmxheW91dC5zaXplLmhlaWdodCoxMDArXCIlXCI6dCtcInB4XCJ9LGQuX3RyYW5zaXRpb25Ubz1mdW5jdGlvbih0LGUpe3RoaXMuZ2V0UG9zaXRpb24oKTt2YXIgaT10aGlzLnBvc2l0aW9uLngsbj10aGlzLnBvc2l0aW9uLnksbz1wYXJzZUludCh0LDEwKSxyPXBhcnNlSW50KGUsMTApLHM9bz09PXRoaXMucG9zaXRpb24ueCYmcj09PXRoaXMucG9zaXRpb24ueTtpZih0aGlzLnNldFBvc2l0aW9uKHQsZSkscyYmIXRoaXMuaXNUcmFuc2l0aW9uaW5nKXJldHVybiB2b2lkIHRoaXMubGF5b3V0UG9zaXRpb24oKTt2YXIgYT10LWksaD1lLW4sdT17fTt1LnRyYW5zZm9ybT10aGlzLmdldFRyYW5zbGF0ZShhLGgpLHRoaXMudHJhbnNpdGlvbih7dG86dSxvblRyYW5zaXRpb25FbmQ6e3RyYW5zZm9ybTp0aGlzLmxheW91dFBvc2l0aW9ufSxpc0NsZWFuaW5nOiEwfSl9LGQuZ2V0VHJhbnNsYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIGk9dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcIm9yaWdpbkxlZnRcIiksbj10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luVG9wXCIpO3JldHVybiB0PWk/dDotdCxlPW4/ZTotZSxcInRyYW5zbGF0ZTNkKFwiK3QrXCJweCwgXCIrZStcInB4LCAwKVwifSxkLmdvVG89ZnVuY3Rpb24odCxlKXt0aGlzLnNldFBvc2l0aW9uKHQsZSksdGhpcy5sYXlvdXRQb3NpdGlvbigpfSxkLm1vdmVUbz1kLl90cmFuc2l0aW9uVG8sZC5zZXRQb3NpdGlvbj1mdW5jdGlvbih0LGUpe3RoaXMucG9zaXRpb24ueD1wYXJzZUludCh0LDEwKSx0aGlzLnBvc2l0aW9uLnk9cGFyc2VJbnQoZSwxMCl9LGQuX25vblRyYW5zaXRpb249ZnVuY3Rpb24odCl7dGhpcy5jc3ModC50byksdC5pc0NsZWFuaW5nJiZ0aGlzLl9yZW1vdmVTdHlsZXModC50byk7Zm9yKHZhciBlIGluIHQub25UcmFuc2l0aW9uRW5kKXQub25UcmFuc2l0aW9uRW5kW2VdLmNhbGwodGhpcyl9LGQudHJhbnNpdGlvbj1mdW5jdGlvbih0KXtpZighcGFyc2VGbG9hdCh0aGlzLmxheW91dC5vcHRpb25zLnRyYW5zaXRpb25EdXJhdGlvbikpcmV0dXJuIHZvaWQgdGhpcy5fbm9uVHJhbnNpdGlvbih0KTt2YXIgZT10aGlzLl90cmFuc247Zm9yKHZhciBpIGluIHQub25UcmFuc2l0aW9uRW5kKWUub25FbmRbaV09dC5vblRyYW5zaXRpb25FbmRbaV07Zm9yKGkgaW4gdC50byllLmluZ1Byb3BlcnRpZXNbaV09ITAsdC5pc0NsZWFuaW5nJiYoZS5jbGVhbltpXT0hMCk7aWYodC5mcm9tKXt0aGlzLmNzcyh0LmZyb20pO3ZhciBuPXRoaXMuZWxlbWVudC5vZmZzZXRIZWlnaHQ7bj1udWxsfXRoaXMuZW5hYmxlVHJhbnNpdGlvbih0LnRvKSx0aGlzLmNzcyh0LnRvKSx0aGlzLmlzVHJhbnNpdGlvbmluZz0hMH07dmFyIGw9XCJvcGFjaXR5LFwiK28oYSk7ZC5lbmFibGVUcmFuc2l0aW9uPWZ1bmN0aW9uKCl7aWYoIXRoaXMuaXNUcmFuc2l0aW9uaW5nKXt2YXIgdD10aGlzLmxheW91dC5vcHRpb25zLnRyYW5zaXRpb25EdXJhdGlvbjt0PVwibnVtYmVyXCI9PXR5cGVvZiB0P3QrXCJtc1wiOnQsdGhpcy5jc3Moe3RyYW5zaXRpb25Qcm9wZXJ0eTpsLHRyYW5zaXRpb25EdXJhdGlvbjp0LHRyYW5zaXRpb25EZWxheTp0aGlzLnN0YWdnZXJEZWxheXx8MH0pLHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGgsdGhpcywhMSl9fSxkLm9ud2Via2l0VHJhbnNpdGlvbkVuZD1mdW5jdGlvbih0KXt0aGlzLm9udHJhbnNpdGlvbmVuZCh0KX0sZC5vbm90cmFuc2l0aW9uZW5kPWZ1bmN0aW9uKHQpe3RoaXMub250cmFuc2l0aW9uZW5kKHQpfTt2YXIgYz17XCItd2Via2l0LXRyYW5zZm9ybVwiOlwidHJhbnNmb3JtXCJ9O2Qub250cmFuc2l0aW9uZW5kPWZ1bmN0aW9uKHQpe2lmKHQudGFyZ2V0PT09dGhpcy5lbGVtZW50KXt2YXIgZT10aGlzLl90cmFuc24sbj1jW3QucHJvcGVydHlOYW1lXXx8dC5wcm9wZXJ0eU5hbWU7aWYoZGVsZXRlIGUuaW5nUHJvcGVydGllc1tuXSxpKGUuaW5nUHJvcGVydGllcykmJnRoaXMuZGlzYWJsZVRyYW5zaXRpb24oKSxuIGluIGUuY2xlYW4mJih0aGlzLmVsZW1lbnQuc3R5bGVbdC5wcm9wZXJ0eU5hbWVdPVwiXCIsZGVsZXRlIGUuY2xlYW5bbl0pLG4gaW4gZS5vbkVuZCl7dmFyIG89ZS5vbkVuZFtuXTtvLmNhbGwodGhpcyksZGVsZXRlIGUub25FbmRbbl19dGhpcy5lbWl0RXZlbnQoXCJ0cmFuc2l0aW9uRW5kXCIsW3RoaXNdKX19LGQuZGlzYWJsZVRyYW5zaXRpb249ZnVuY3Rpb24oKXt0aGlzLnJlbW92ZVRyYW5zaXRpb25TdHlsZXMoKSx0aGlzLmVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihoLHRoaXMsITEpLHRoaXMuaXNUcmFuc2l0aW9uaW5nPSExfSxkLl9yZW1vdmVTdHlsZXM9ZnVuY3Rpb24odCl7dmFyIGU9e307Zm9yKHZhciBpIGluIHQpZVtpXT1cIlwiO3RoaXMuY3NzKGUpfTt2YXIgZj17dHJhbnNpdGlvblByb3BlcnR5OlwiXCIsdHJhbnNpdGlvbkR1cmF0aW9uOlwiXCIsdHJhbnNpdGlvbkRlbGF5OlwiXCJ9O3JldHVybiBkLnJlbW92ZVRyYW5zaXRpb25TdHlsZXM9ZnVuY3Rpb24oKXt0aGlzLmNzcyhmKX0sZC5zdGFnZ2VyPWZ1bmN0aW9uKHQpe3Q9aXNOYU4odCk/MDp0LHRoaXMuc3RhZ2dlckRlbGF5PXQrXCJtc1wifSxkLnJlbW92ZUVsZW09ZnVuY3Rpb24oKXt0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpLHRoaXMuY3NzKHtkaXNwbGF5OlwiXCJ9KSx0aGlzLmVtaXRFdmVudChcInJlbW92ZVwiLFt0aGlzXSl9LGQucmVtb3ZlPWZ1bmN0aW9uKCl7cmV0dXJuIHMmJnBhcnNlRmxvYXQodGhpcy5sYXlvdXQub3B0aW9ucy50cmFuc2l0aW9uRHVyYXRpb24pPyh0aGlzLm9uY2UoXCJ0cmFuc2l0aW9uRW5kXCIsZnVuY3Rpb24oKXt0aGlzLnJlbW92ZUVsZW0oKX0pLHZvaWQgdGhpcy5oaWRlKCkpOnZvaWQgdGhpcy5yZW1vdmVFbGVtKCl9LGQucmV2ZWFsPWZ1bmN0aW9uKCl7ZGVsZXRlIHRoaXMuaXNIaWRkZW4sdGhpcy5jc3Moe2Rpc3BsYXk6XCJcIn0pO3ZhciB0PXRoaXMubGF5b3V0Lm9wdGlvbnMsZT17fSxpPXRoaXMuZ2V0SGlkZVJldmVhbFRyYW5zaXRpb25FbmRQcm9wZXJ0eShcInZpc2libGVTdHlsZVwiKTtlW2ldPXRoaXMub25SZXZlYWxUcmFuc2l0aW9uRW5kLHRoaXMudHJhbnNpdGlvbih7ZnJvbTp0LmhpZGRlblN0eWxlLHRvOnQudmlzaWJsZVN0eWxlLGlzQ2xlYW5pbmc6ITAsb25UcmFuc2l0aW9uRW5kOmV9KX0sZC5vblJldmVhbFRyYW5zaXRpb25FbmQ9ZnVuY3Rpb24oKXt0aGlzLmlzSGlkZGVufHx0aGlzLmVtaXRFdmVudChcInJldmVhbFwiKX0sZC5nZXRIaWRlUmV2ZWFsVHJhbnNpdGlvbkVuZFByb3BlcnR5PWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMubGF5b3V0Lm9wdGlvbnNbdF07aWYoZS5vcGFjaXR5KXJldHVyblwib3BhY2l0eVwiO2Zvcih2YXIgaSBpbiBlKXJldHVybiBpfSxkLmhpZGU9ZnVuY3Rpb24oKXt0aGlzLmlzSGlkZGVuPSEwLHRoaXMuY3NzKHtkaXNwbGF5OlwiXCJ9KTt2YXIgdD10aGlzLmxheW91dC5vcHRpb25zLGU9e30saT10aGlzLmdldEhpZGVSZXZlYWxUcmFuc2l0aW9uRW5kUHJvcGVydHkoXCJoaWRkZW5TdHlsZVwiKTtlW2ldPXRoaXMub25IaWRlVHJhbnNpdGlvbkVuZCx0aGlzLnRyYW5zaXRpb24oe2Zyb206dC52aXNpYmxlU3R5bGUsdG86dC5oaWRkZW5TdHlsZSxpc0NsZWFuaW5nOiEwLG9uVHJhbnNpdGlvbkVuZDplfSl9LGQub25IaWRlVHJhbnNpdGlvbkVuZD1mdW5jdGlvbigpe3RoaXMuaXNIaWRkZW4mJih0aGlzLmNzcyh7ZGlzcGxheTpcIm5vbmVcIn0pLHRoaXMuZW1pdEV2ZW50KFwiaGlkZVwiKSl9LGQuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMuY3NzKHtwb3NpdGlvbjpcIlwiLGxlZnQ6XCJcIixyaWdodDpcIlwiLHRvcDpcIlwiLGJvdHRvbTpcIlwiLHRyYW5zaXRpb246XCJcIix0cmFuc2Zvcm06XCJcIn0pfSxufSksZnVuY3Rpb24odCxlKXtcInVzZSBzdHJpY3RcIjtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwib3V0bGF5ZXIvb3V0bGF5ZXJcIixbXCJldi1lbWl0dGVyL2V2LWVtaXR0ZXJcIixcImdldC1zaXplL2dldC1zaXplXCIsXCJmaXp6eS11aS11dGlscy91dGlsc1wiLFwiLi9pdGVtXCJdLGZ1bmN0aW9uKGksbixvLHIpe3JldHVybiBlKHQsaSxuLG8scil9KTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKHQscmVxdWlyZShcImV2LWVtaXR0ZXJcIikscmVxdWlyZShcImdldC1zaXplXCIpLHJlcXVpcmUoXCJmaXp6eS11aS11dGlsc1wiKSxyZXF1aXJlKFwiLi9pdGVtXCIpKTp0Lk91dGxheWVyPWUodCx0LkV2RW1pdHRlcix0LmdldFNpemUsdC5maXp6eVVJVXRpbHMsdC5PdXRsYXllci5JdGVtKX0od2luZG93LGZ1bmN0aW9uKHQsZSxpLG4sbyl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gcih0LGUpe3ZhciBpPW4uZ2V0UXVlcnlFbGVtZW50KHQpO2lmKCFpKXJldHVybiB2b2lkKGgmJmguZXJyb3IoXCJCYWQgZWxlbWVudCBmb3IgXCIrdGhpcy5jb25zdHJ1Y3Rvci5uYW1lc3BhY2UrXCI6IFwiKyhpfHx0KSkpO3RoaXMuZWxlbWVudD1pLHUmJih0aGlzLiRlbGVtZW50PXUodGhpcy5lbGVtZW50KSksdGhpcy5vcHRpb25zPW4uZXh0ZW5kKHt9LHRoaXMuY29uc3RydWN0b3IuZGVmYXVsdHMpLHRoaXMub3B0aW9uKGUpO3ZhciBvPSsrbDt0aGlzLmVsZW1lbnQub3V0bGF5ZXJHVUlEPW8sY1tvXT10aGlzLHRoaXMuX2NyZWF0ZSgpO3ZhciByPXRoaXMuX2dldE9wdGlvbihcImluaXRMYXlvdXRcIik7ciYmdGhpcy5sYXlvdXQoKX1mdW5jdGlvbiBzKHQpe2Z1bmN0aW9uIGUoKXt0LmFwcGx5KHRoaXMsYXJndW1lbnRzKX1yZXR1cm4gZS5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZSh0LnByb3RvdHlwZSksZS5wcm90b3R5cGUuY29uc3RydWN0b3I9ZSxlfWZ1bmN0aW9uIGEodCl7aWYoXCJudW1iZXJcIj09dHlwZW9mIHQpcmV0dXJuIHQ7dmFyIGU9dC5tYXRjaCgvKF5cXGQqXFwuP1xcZCopKFxcdyopLyksaT1lJiZlWzFdLG49ZSYmZVsyXTtpZighaS5sZW5ndGgpcmV0dXJuIDA7aT1wYXJzZUZsb2F0KGkpO3ZhciBvPW1bbl18fDE7cmV0dXJuIGkqb312YXIgaD10LmNvbnNvbGUsdT10LmpRdWVyeSxkPWZ1bmN0aW9uKCl7fSxsPTAsYz17fTtyLm5hbWVzcGFjZT1cIm91dGxheWVyXCIsci5JdGVtPW8sci5kZWZhdWx0cz17Y29udGFpbmVyU3R5bGU6e3Bvc2l0aW9uOlwicmVsYXRpdmVcIn0saW5pdExheW91dDohMCxvcmlnaW5MZWZ0OiEwLG9yaWdpblRvcDohMCxyZXNpemU6ITAscmVzaXplQ29udGFpbmVyOiEwLHRyYW5zaXRpb25EdXJhdGlvbjpcIjAuNHNcIixoaWRkZW5TdHlsZTp7b3BhY2l0eTowLHRyYW5zZm9ybTpcInNjYWxlKDAuMDAxKVwifSx2aXNpYmxlU3R5bGU6e29wYWNpdHk6MSx0cmFuc2Zvcm06XCJzY2FsZSgxKVwifX07dmFyIGY9ci5wcm90b3R5cGU7bi5leHRlbmQoZixlLnByb3RvdHlwZSksZi5vcHRpb249ZnVuY3Rpb24odCl7bi5leHRlbmQodGhpcy5vcHRpb25zLHQpfSxmLl9nZXRPcHRpb249ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5jb25zdHJ1Y3Rvci5jb21wYXRPcHRpb25zW3RdO3JldHVybiBlJiZ2b2lkIDAhPT10aGlzLm9wdGlvbnNbZV0/dGhpcy5vcHRpb25zW2VdOnRoaXMub3B0aW9uc1t0XX0sci5jb21wYXRPcHRpb25zPXtpbml0TGF5b3V0OlwiaXNJbml0TGF5b3V0XCIsaG9yaXpvbnRhbDpcImlzSG9yaXpvbnRhbFwiLGxheW91dEluc3RhbnQ6XCJpc0xheW91dEluc3RhbnRcIixvcmlnaW5MZWZ0OlwiaXNPcmlnaW5MZWZ0XCIsb3JpZ2luVG9wOlwiaXNPcmlnaW5Ub3BcIixyZXNpemU6XCJpc1Jlc2l6ZUJvdW5kXCIscmVzaXplQ29udGFpbmVyOlwiaXNSZXNpemluZ0NvbnRhaW5lclwifSxmLl9jcmVhdGU9ZnVuY3Rpb24oKXt0aGlzLnJlbG9hZEl0ZW1zKCksdGhpcy5zdGFtcHM9W10sdGhpcy5zdGFtcCh0aGlzLm9wdGlvbnMuc3RhbXApLG4uZXh0ZW5kKHRoaXMuZWxlbWVudC5zdHlsZSx0aGlzLm9wdGlvbnMuY29udGFpbmVyU3R5bGUpO3ZhciB0PXRoaXMuX2dldE9wdGlvbihcInJlc2l6ZVwiKTt0JiZ0aGlzLmJpbmRSZXNpemUoKX0sZi5yZWxvYWRJdGVtcz1mdW5jdGlvbigpe3RoaXMuaXRlbXM9dGhpcy5faXRlbWl6ZSh0aGlzLmVsZW1lbnQuY2hpbGRyZW4pfSxmLl9pdGVtaXplPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT10aGlzLl9maWx0ZXJGaW5kSXRlbUVsZW1lbnRzKHQpLGk9dGhpcy5jb25zdHJ1Y3Rvci5JdGVtLG49W10sbz0wO288ZS5sZW5ndGg7bysrKXt2YXIgcj1lW29dLHM9bmV3IGkocix0aGlzKTtuLnB1c2gocyl9cmV0dXJuIG59LGYuX2ZpbHRlckZpbmRJdGVtRWxlbWVudHM9ZnVuY3Rpb24odCl7cmV0dXJuIG4uZmlsdGVyRmluZEVsZW1lbnRzKHQsdGhpcy5vcHRpb25zLml0ZW1TZWxlY3Rvcil9LGYuZ2V0SXRlbUVsZW1lbnRzPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaXRlbXMubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0LmVsZW1lbnR9KX0sZi5sYXlvdXQ9ZnVuY3Rpb24oKXt0aGlzLl9yZXNldExheW91dCgpLHRoaXMuX21hbmFnZVN0YW1wcygpO3ZhciB0PXRoaXMuX2dldE9wdGlvbihcImxheW91dEluc3RhbnRcIiksZT12b2lkIDAhPT10P3Q6IXRoaXMuX2lzTGF5b3V0SW5pdGVkO3RoaXMubGF5b3V0SXRlbXModGhpcy5pdGVtcyxlKSx0aGlzLl9pc0xheW91dEluaXRlZD0hMH0sZi5faW5pdD1mLmxheW91dCxmLl9yZXNldExheW91dD1mdW5jdGlvbigpe3RoaXMuZ2V0U2l6ZSgpfSxmLmdldFNpemU9ZnVuY3Rpb24oKXt0aGlzLnNpemU9aSh0aGlzLmVsZW1lbnQpfSxmLl9nZXRNZWFzdXJlbWVudD1mdW5jdGlvbih0LGUpe3ZhciBuLG89dGhpcy5vcHRpb25zW3RdO28/KFwic3RyaW5nXCI9PXR5cGVvZiBvP249dGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3Iobyk6byBpbnN0YW5jZW9mIEhUTUxFbGVtZW50JiYobj1vKSx0aGlzW3RdPW4/aShuKVtlXTpvKTp0aGlzW3RdPTB9LGYubGF5b3V0SXRlbXM9ZnVuY3Rpb24odCxlKXt0PXRoaXMuX2dldEl0ZW1zRm9yTGF5b3V0KHQpLHRoaXMuX2xheW91dEl0ZW1zKHQsZSksdGhpcy5fcG9zdExheW91dCgpfSxmLl9nZXRJdGVtc0ZvckxheW91dD1mdW5jdGlvbih0KXtyZXR1cm4gdC5maWx0ZXIoZnVuY3Rpb24odCl7cmV0dXJuIXQuaXNJZ25vcmVkfSl9LGYuX2xheW91dEl0ZW1zPWZ1bmN0aW9uKHQsZSl7aWYodGhpcy5fZW1pdENvbXBsZXRlT25JdGVtcyhcImxheW91dFwiLHQpLHQmJnQubGVuZ3RoKXt2YXIgaT1bXTt0LmZvckVhY2goZnVuY3Rpb24odCl7dmFyIG49dGhpcy5fZ2V0SXRlbUxheW91dFBvc2l0aW9uKHQpO24uaXRlbT10LG4uaXNJbnN0YW50PWV8fHQuaXNMYXlvdXRJbnN0YW50LGkucHVzaChuKX0sdGhpcyksdGhpcy5fcHJvY2Vzc0xheW91dFF1ZXVlKGkpfX0sZi5fZ2V0SXRlbUxheW91dFBvc2l0aW9uPWZ1bmN0aW9uKCl7cmV0dXJue3g6MCx5OjB9fSxmLl9wcm9jZXNzTGF5b3V0UXVldWU9ZnVuY3Rpb24odCl7dGhpcy51cGRhdGVTdGFnZ2VyKCksdC5mb3JFYWNoKGZ1bmN0aW9uKHQsZSl7dGhpcy5fcG9zaXRpb25JdGVtKHQuaXRlbSx0LngsdC55LHQuaXNJbnN0YW50LGUpfSx0aGlzKX0sZi51cGRhdGVTdGFnZ2VyPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5vcHRpb25zLnN0YWdnZXI7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P3ZvaWQodGhpcy5zdGFnZ2VyPTApOih0aGlzLnN0YWdnZXI9YSh0KSx0aGlzLnN0YWdnZXIpfSxmLl9wb3NpdGlvbkl0ZW09ZnVuY3Rpb24odCxlLGksbixvKXtuP3QuZ29UbyhlLGkpOih0LnN0YWdnZXIobyp0aGlzLnN0YWdnZXIpLHQubW92ZVRvKGUsaSkpfSxmLl9wb3N0TGF5b3V0PWZ1bmN0aW9uKCl7dGhpcy5yZXNpemVDb250YWluZXIoKX0sZi5yZXNpemVDb250YWluZXI9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9nZXRPcHRpb24oXCJyZXNpemVDb250YWluZXJcIik7aWYodCl7dmFyIGU9dGhpcy5fZ2V0Q29udGFpbmVyU2l6ZSgpO2UmJih0aGlzLl9zZXRDb250YWluZXJNZWFzdXJlKGUud2lkdGgsITApLHRoaXMuX3NldENvbnRhaW5lck1lYXN1cmUoZS5oZWlnaHQsITEpKX19LGYuX2dldENvbnRhaW5lclNpemU9ZCxmLl9zZXRDb250YWluZXJNZWFzdXJlPWZ1bmN0aW9uKHQsZSl7aWYodm9pZCAwIT09dCl7dmFyIGk9dGhpcy5zaXplO2kuaXNCb3JkZXJCb3gmJih0Kz1lP2kucGFkZGluZ0xlZnQraS5wYWRkaW5nUmlnaHQraS5ib3JkZXJMZWZ0V2lkdGgraS5ib3JkZXJSaWdodFdpZHRoOmkucGFkZGluZ0JvdHRvbStpLnBhZGRpbmdUb3AraS5ib3JkZXJUb3BXaWR0aCtpLmJvcmRlckJvdHRvbVdpZHRoKSx0PU1hdGgubWF4KHQsMCksdGhpcy5lbGVtZW50LnN0eWxlW2U/XCJ3aWR0aFwiOlwiaGVpZ2h0XCJdPXQrXCJweFwifX0sZi5fZW1pdENvbXBsZXRlT25JdGVtcz1mdW5jdGlvbih0LGUpe2Z1bmN0aW9uIGkoKXtvLmRpc3BhdGNoRXZlbnQodCtcIkNvbXBsZXRlXCIsbnVsbCxbZV0pfWZ1bmN0aW9uIG4oKXtzKysscz09ciYmaSgpfXZhciBvPXRoaXMscj1lLmxlbmd0aDtpZighZXx8IXIpcmV0dXJuIHZvaWQgaSgpO3ZhciBzPTA7ZS5mb3JFYWNoKGZ1bmN0aW9uKGUpe2Uub25jZSh0LG4pfSl9LGYuZGlzcGF0Y2hFdmVudD1mdW5jdGlvbih0LGUsaSl7dmFyIG49ZT9bZV0uY29uY2F0KGkpOmk7aWYodGhpcy5lbWl0RXZlbnQodCxuKSx1KWlmKHRoaXMuJGVsZW1lbnQ9dGhpcy4kZWxlbWVudHx8dSh0aGlzLmVsZW1lbnQpLGUpe3ZhciBvPXUuRXZlbnQoZSk7by50eXBlPXQsdGhpcy4kZWxlbWVudC50cmlnZ2VyKG8saSl9ZWxzZSB0aGlzLiRlbGVtZW50LnRyaWdnZXIodCxpKX0sZi5pZ25vcmU9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5nZXRJdGVtKHQpO2UmJihlLmlzSWdub3JlZD0hMCl9LGYudW5pZ25vcmU9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5nZXRJdGVtKHQpO2UmJmRlbGV0ZSBlLmlzSWdub3JlZH0sZi5zdGFtcD1mdW5jdGlvbih0KXt0PXRoaXMuX2ZpbmQodCksdCYmKHRoaXMuc3RhbXBzPXRoaXMuc3RhbXBzLmNvbmNhdCh0KSx0LmZvckVhY2godGhpcy5pZ25vcmUsdGhpcykpfSxmLnVuc3RhbXA9ZnVuY3Rpb24odCl7dD10aGlzLl9maW5kKHQpLHQmJnQuZm9yRWFjaChmdW5jdGlvbih0KXtuLnJlbW92ZUZyb20odGhpcy5zdGFtcHMsdCksdGhpcy51bmlnbm9yZSh0KX0sdGhpcyl9LGYuX2ZpbmQ9ZnVuY3Rpb24odCl7cmV0dXJuIHQ/KFwic3RyaW5nXCI9PXR5cGVvZiB0JiYodD10aGlzLmVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCh0KSksdD1uLm1ha2VBcnJheSh0KSk6dm9pZCAwfSxmLl9tYW5hZ2VTdGFtcHM9ZnVuY3Rpb24oKXt0aGlzLnN0YW1wcyYmdGhpcy5zdGFtcHMubGVuZ3RoJiYodGhpcy5fZ2V0Qm91bmRpbmdSZWN0KCksdGhpcy5zdGFtcHMuZm9yRWFjaCh0aGlzLl9tYW5hZ2VTdGFtcCx0aGlzKSl9LGYuX2dldEJvdW5kaW5nUmVjdD1mdW5jdGlvbigpe3ZhciB0PXRoaXMuZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxlPXRoaXMuc2l6ZTt0aGlzLl9ib3VuZGluZ1JlY3Q9e2xlZnQ6dC5sZWZ0K2UucGFkZGluZ0xlZnQrZS5ib3JkZXJMZWZ0V2lkdGgsdG9wOnQudG9wK2UucGFkZGluZ1RvcCtlLmJvcmRlclRvcFdpZHRoLHJpZ2h0OnQucmlnaHQtKGUucGFkZGluZ1JpZ2h0K2UuYm9yZGVyUmlnaHRXaWR0aCksYm90dG9tOnQuYm90dG9tLShlLnBhZGRpbmdCb3R0b20rZS5ib3JkZXJCb3R0b21XaWR0aCl9fSxmLl9tYW5hZ2VTdGFtcD1kLGYuX2dldEVsZW1lbnRPZmZzZXQ9ZnVuY3Rpb24odCl7dmFyIGU9dC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxuPXRoaXMuX2JvdW5kaW5nUmVjdCxvPWkodCkscj17bGVmdDplLmxlZnQtbi5sZWZ0LW8ubWFyZ2luTGVmdCx0b3A6ZS50b3Atbi50b3Atby5tYXJnaW5Ub3AscmlnaHQ6bi5yaWdodC1lLnJpZ2h0LW8ubWFyZ2luUmlnaHQsYm90dG9tOm4uYm90dG9tLWUuYm90dG9tLW8ubWFyZ2luQm90dG9tfTtyZXR1cm4gcn0sZi5oYW5kbGVFdmVudD1uLmhhbmRsZUV2ZW50LGYuYmluZFJlc2l6ZT1mdW5jdGlvbigpe3QuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLHRoaXMpLHRoaXMuaXNSZXNpemVCb3VuZD0hMH0sZi51bmJpbmRSZXNpemU9ZnVuY3Rpb24oKXt0LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIix0aGlzKSx0aGlzLmlzUmVzaXplQm91bmQ9ITF9LGYub25yZXNpemU9ZnVuY3Rpb24oKXt0aGlzLnJlc2l6ZSgpfSxuLmRlYm91bmNlTWV0aG9kKHIsXCJvbnJlc2l6ZVwiLDEwMCksZi5yZXNpemU9ZnVuY3Rpb24oKXt0aGlzLmlzUmVzaXplQm91bmQmJnRoaXMubmVlZHNSZXNpemVMYXlvdXQoKSYmdGhpcy5sYXlvdXQoKX0sZi5uZWVkc1Jlc2l6ZUxheW91dD1mdW5jdGlvbigpe3ZhciB0PWkodGhpcy5lbGVtZW50KSxlPXRoaXMuc2l6ZSYmdDtyZXR1cm4gZSYmdC5pbm5lcldpZHRoIT09dGhpcy5zaXplLmlubmVyV2lkdGh9LGYuYWRkSXRlbXM9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5faXRlbWl6ZSh0KTtyZXR1cm4gZS5sZW5ndGgmJih0aGlzLml0ZW1zPXRoaXMuaXRlbXMuY29uY2F0KGUpKSxlfSxmLmFwcGVuZGVkPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuYWRkSXRlbXModCk7ZS5sZW5ndGgmJih0aGlzLmxheW91dEl0ZW1zKGUsITApLHRoaXMucmV2ZWFsKGUpKX0sZi5wcmVwZW5kZWQ9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5faXRlbWl6ZSh0KTtpZihlLmxlbmd0aCl7dmFyIGk9dGhpcy5pdGVtcy5zbGljZSgwKTt0aGlzLml0ZW1zPWUuY29uY2F0KGkpLHRoaXMuX3Jlc2V0TGF5b3V0KCksdGhpcy5fbWFuYWdlU3RhbXBzKCksdGhpcy5sYXlvdXRJdGVtcyhlLCEwKSx0aGlzLnJldmVhbChlKSx0aGlzLmxheW91dEl0ZW1zKGkpfX0sZi5yZXZlYWw9ZnVuY3Rpb24odCl7aWYodGhpcy5fZW1pdENvbXBsZXRlT25JdGVtcyhcInJldmVhbFwiLHQpLHQmJnQubGVuZ3RoKXt2YXIgZT10aGlzLnVwZGF0ZVN0YWdnZXIoKTt0LmZvckVhY2goZnVuY3Rpb24odCxpKXt0LnN0YWdnZXIoaSplKSx0LnJldmVhbCgpfSl9fSxmLmhpZGU9ZnVuY3Rpb24odCl7aWYodGhpcy5fZW1pdENvbXBsZXRlT25JdGVtcyhcImhpZGVcIix0KSx0JiZ0Lmxlbmd0aCl7dmFyIGU9dGhpcy51cGRhdGVTdGFnZ2VyKCk7dC5mb3JFYWNoKGZ1bmN0aW9uKHQsaSl7dC5zdGFnZ2VyKGkqZSksdC5oaWRlKCl9KX19LGYucmV2ZWFsSXRlbUVsZW1lbnRzPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZ2V0SXRlbXModCk7dGhpcy5yZXZlYWwoZSl9LGYuaGlkZUl0ZW1FbGVtZW50cz1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmdldEl0ZW1zKHQpO3RoaXMuaGlkZShlKX0sZi5nZXRJdGVtPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT0wO2U8dGhpcy5pdGVtcy5sZW5ndGg7ZSsrKXt2YXIgaT10aGlzLml0ZW1zW2VdO2lmKGkuZWxlbWVudD09dClyZXR1cm4gaX19LGYuZ2V0SXRlbXM9ZnVuY3Rpb24odCl7dD1uLm1ha2VBcnJheSh0KTt2YXIgZT1bXTtyZXR1cm4gdC5mb3JFYWNoKGZ1bmN0aW9uKHQpe3ZhciBpPXRoaXMuZ2V0SXRlbSh0KTtpJiZlLnB1c2goaSl9LHRoaXMpLGV9LGYucmVtb3ZlPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZ2V0SXRlbXModCk7dGhpcy5fZW1pdENvbXBsZXRlT25JdGVtcyhcInJlbW92ZVwiLGUpLGUmJmUubGVuZ3RoJiZlLmZvckVhY2goZnVuY3Rpb24odCl7dC5yZW1vdmUoKSxuLnJlbW92ZUZyb20odGhpcy5pdGVtcyx0KX0sdGhpcyl9LGYuZGVzdHJveT1mdW5jdGlvbigpe3ZhciB0PXRoaXMuZWxlbWVudC5zdHlsZTt0LmhlaWdodD1cIlwiLHQucG9zaXRpb249XCJcIix0LndpZHRoPVwiXCIsdGhpcy5pdGVtcy5mb3JFYWNoKGZ1bmN0aW9uKHQpe3QuZGVzdHJveSgpfSksdGhpcy51bmJpbmRSZXNpemUoKTt2YXIgZT10aGlzLmVsZW1lbnQub3V0bGF5ZXJHVUlEO2RlbGV0ZSBjW2VdLGRlbGV0ZSB0aGlzLmVsZW1lbnQub3V0bGF5ZXJHVUlELHUmJnUucmVtb3ZlRGF0YSh0aGlzLmVsZW1lbnQsdGhpcy5jb25zdHJ1Y3Rvci5uYW1lc3BhY2UpfSxyLmRhdGE9ZnVuY3Rpb24odCl7dD1uLmdldFF1ZXJ5RWxlbWVudCh0KTt2YXIgZT10JiZ0Lm91dGxheWVyR1VJRDtyZXR1cm4gZSYmY1tlXX0sci5jcmVhdGU9ZnVuY3Rpb24odCxlKXt2YXIgaT1zKHIpO3JldHVybiBpLmRlZmF1bHRzPW4uZXh0ZW5kKHt9LHIuZGVmYXVsdHMpLG4uZXh0ZW5kKGkuZGVmYXVsdHMsZSksaS5jb21wYXRPcHRpb25zPW4uZXh0ZW5kKHt9LHIuY29tcGF0T3B0aW9ucyksaS5uYW1lc3BhY2U9dCxpLmRhdGE9ci5kYXRhLGkuSXRlbT1zKG8pLG4uaHRtbEluaXQoaSx0KSx1JiZ1LmJyaWRnZXQmJnUuYnJpZGdldCh0LGkpLGl9O3ZhciBtPXttczoxLHM6MWUzfTtyZXR1cm4gci5JdGVtPW8scn0pLGZ1bmN0aW9uKHQsZSl7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShbXCJvdXRsYXllci9vdXRsYXllclwiLFwiZ2V0LXNpemUvZ2V0LXNpemVcIl0sZSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZShyZXF1aXJlKFwib3V0bGF5ZXJcIikscmVxdWlyZShcImdldC1zaXplXCIpKTp0Lk1hc29ucnk9ZSh0Lk91dGxheWVyLHQuZ2V0U2l6ZSl9KHdpbmRvdyxmdW5jdGlvbih0LGUpe3ZhciBpPXQuY3JlYXRlKFwibWFzb25yeVwiKTtpLmNvbXBhdE9wdGlvbnMuZml0V2lkdGg9XCJpc0ZpdFdpZHRoXCI7dmFyIG49aS5wcm90b3R5cGU7cmV0dXJuIG4uX3Jlc2V0TGF5b3V0PWZ1bmN0aW9uKCl7dGhpcy5nZXRTaXplKCksdGhpcy5fZ2V0TWVhc3VyZW1lbnQoXCJjb2x1bW5XaWR0aFwiLFwib3V0ZXJXaWR0aFwiKSx0aGlzLl9nZXRNZWFzdXJlbWVudChcImd1dHRlclwiLFwib3V0ZXJXaWR0aFwiKSx0aGlzLm1lYXN1cmVDb2x1bW5zKCksdGhpcy5jb2xZcz1bXTtmb3IodmFyIHQ9MDt0PHRoaXMuY29sczt0KyspdGhpcy5jb2xZcy5wdXNoKDApO3RoaXMubWF4WT0wLHRoaXMuaG9yaXpvbnRhbENvbEluZGV4PTB9LG4ubWVhc3VyZUNvbHVtbnM9ZnVuY3Rpb24oKXtpZih0aGlzLmdldENvbnRhaW5lcldpZHRoKCksIXRoaXMuY29sdW1uV2lkdGgpe3ZhciB0PXRoaXMuaXRlbXNbMF0saT10JiZ0LmVsZW1lbnQ7dGhpcy5jb2x1bW5XaWR0aD1pJiZlKGkpLm91dGVyV2lkdGh8fHRoaXMuY29udGFpbmVyV2lkdGh9dmFyIG49dGhpcy5jb2x1bW5XaWR0aCs9dGhpcy5ndXR0ZXIsbz10aGlzLmNvbnRhaW5lcldpZHRoK3RoaXMuZ3V0dGVyLHI9by9uLHM9bi1vJW4sYT1zJiYxPnM/XCJyb3VuZFwiOlwiZmxvb3JcIjtyPU1hdGhbYV0ociksdGhpcy5jb2xzPU1hdGgubWF4KHIsMSl9LG4uZ2V0Q29udGFpbmVyV2lkdGg9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9nZXRPcHRpb24oXCJmaXRXaWR0aFwiKSxpPXQ/dGhpcy5lbGVtZW50LnBhcmVudE5vZGU6dGhpcy5lbGVtZW50LG49ZShpKTt0aGlzLmNvbnRhaW5lcldpZHRoPW4mJm4uaW5uZXJXaWR0aH0sbi5fZ2V0SXRlbUxheW91dFBvc2l0aW9uPWZ1bmN0aW9uKHQpe3QuZ2V0U2l6ZSgpO3ZhciBlPXQuc2l6ZS5vdXRlcldpZHRoJXRoaXMuY29sdW1uV2lkdGgsaT1lJiYxPmU/XCJyb3VuZFwiOlwiY2VpbFwiLG49TWF0aFtpXSh0LnNpemUub3V0ZXJXaWR0aC90aGlzLmNvbHVtbldpZHRoKTtuPU1hdGgubWluKG4sdGhpcy5jb2xzKTtmb3IodmFyIG89dGhpcy5vcHRpb25zLmhvcml6b250YWxPcmRlcj9cIl9nZXRIb3Jpem9udGFsQ29sUG9zaXRpb25cIjpcIl9nZXRUb3BDb2xQb3NpdGlvblwiLHI9dGhpc1tvXShuLHQpLHM9e3g6dGhpcy5jb2x1bW5XaWR0aCpyLmNvbCx5OnIueX0sYT1yLnkrdC5zaXplLm91dGVySGVpZ2h0LGg9bityLmNvbCx1PXIuY29sO2g+dTt1KyspdGhpcy5jb2xZc1t1XT1hO3JldHVybiBzfSxuLl9nZXRUb3BDb2xQb3NpdGlvbj1mdW5jdGlvbih0KXt2YXIgZT10aGlzLl9nZXRUb3BDb2xHcm91cCh0KSxpPU1hdGgubWluLmFwcGx5KE1hdGgsZSk7cmV0dXJue2NvbDplLmluZGV4T2YoaSkseTppfX0sbi5fZ2V0VG9wQ29sR3JvdXA9ZnVuY3Rpb24odCl7aWYoMj50KXJldHVybiB0aGlzLmNvbFlzO2Zvcih2YXIgZT1bXSxpPXRoaXMuY29scysxLXQsbj0wO2k+bjtuKyspZVtuXT10aGlzLl9nZXRDb2xHcm91cFkobix0KTtyZXR1cm4gZX0sbi5fZ2V0Q29sR3JvdXBZPWZ1bmN0aW9uKHQsZSl7aWYoMj5lKXJldHVybiB0aGlzLmNvbFlzW3RdO3ZhciBpPXRoaXMuY29sWXMuc2xpY2UodCx0K2UpO3JldHVybiBNYXRoLm1heC5hcHBseShNYXRoLGkpfSxuLl9nZXRIb3Jpem9udGFsQ29sUG9zaXRpb249ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLmhvcml6b250YWxDb2xJbmRleCV0aGlzLmNvbHMsbj10PjEmJmkrdD50aGlzLmNvbHM7aT1uPzA6aTt2YXIgbz1lLnNpemUub3V0ZXJXaWR0aCYmZS5zaXplLm91dGVySGVpZ2h0O3JldHVybiB0aGlzLmhvcml6b250YWxDb2xJbmRleD1vP2krdDp0aGlzLmhvcml6b250YWxDb2xJbmRleCx7Y29sOmkseTp0aGlzLl9nZXRDb2xHcm91cFkoaSx0KX19LG4uX21hbmFnZVN0YW1wPWZ1bmN0aW9uKHQpe3ZhciBpPWUodCksbj10aGlzLl9nZXRFbGVtZW50T2Zmc2V0KHQpLG89dGhpcy5fZ2V0T3B0aW9uKFwib3JpZ2luTGVmdFwiKSxyPW8/bi5sZWZ0Om4ucmlnaHQscz1yK2kub3V0ZXJXaWR0aCxhPU1hdGguZmxvb3Ioci90aGlzLmNvbHVtbldpZHRoKTthPU1hdGgubWF4KDAsYSk7dmFyIGg9TWF0aC5mbG9vcihzL3RoaXMuY29sdW1uV2lkdGgpO2gtPXMldGhpcy5jb2x1bW5XaWR0aD8wOjEsaD1NYXRoLm1pbih0aGlzLmNvbHMtMSxoKTtmb3IodmFyIHU9dGhpcy5fZ2V0T3B0aW9uKFwib3JpZ2luVG9wXCIpLGQ9KHU/bi50b3A6bi5ib3R0b20pK2kub3V0ZXJIZWlnaHQsbD1hO2g+PWw7bCsrKXRoaXMuY29sWXNbbF09TWF0aC5tYXgoZCx0aGlzLmNvbFlzW2xdKX0sbi5fZ2V0Q29udGFpbmVyU2l6ZT1mdW5jdGlvbigpe3RoaXMubWF4WT1NYXRoLm1heC5hcHBseShNYXRoLHRoaXMuY29sWXMpO3ZhciB0PXtoZWlnaHQ6dGhpcy5tYXhZfTtyZXR1cm4gdGhpcy5fZ2V0T3B0aW9uKFwiZml0V2lkdGhcIikmJih0LndpZHRoPXRoaXMuX2dldENvbnRhaW5lckZpdFdpZHRoKCkpLHR9LG4uX2dldENvbnRhaW5lckZpdFdpZHRoPWZ1bmN0aW9uKCl7Zm9yKHZhciB0PTAsZT10aGlzLmNvbHM7LS1lJiYwPT09dGhpcy5jb2xZc1tlXTspdCsrO3JldHVybih0aGlzLmNvbHMtdCkqdGhpcy5jb2x1bW5XaWR0aC10aGlzLmd1dHRlcn0sbi5uZWVkc1Jlc2l6ZUxheW91dD1mdW5jdGlvbigpe3ZhciB0PXRoaXMuY29udGFpbmVyV2lkdGg7cmV0dXJuIHRoaXMuZ2V0Q29udGFpbmVyV2lkdGgoKSx0IT10aGlzLmNvbnRhaW5lcldpZHRofSxpfSk7IiwiXHJcbmZ1bmN0aW9uIHN0YXJGdW5jdGlvbih4LCB5KSB7XHJcblxyXG4gICAgYXBpX3VybCA9ICcvYXBpL3YxL3N0YXIvJyArIHkgKyAnLyc7XHJcblxyXG4gICAgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJmYS1zdGFyLW9cIikpe1xyXG4gICAgICAgICBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcIm5vdC1sb2dnZWQtaW5cIikpe1xyXG4vLyAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmNzcyh7XCJ2aXNpYmlsaXR5XCI6XCJ2aXNpYmxlXCIsXCJkaXNwbGF5XCI6XCJibG9ja1wifSk7XHJcbiAgICAgICAgICAgICQoXCIjcmVzdGF1cmFudFwiKS5jc3Moe1wiZGlzcGxheVwiOlwibm9uZVwifSk7XHJcbiAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmZhZGVJbigpO1xyXG4vLyAgICAgICAgICAgICQoXCIjcmVzdGF1cmFudFwiKS5mYWRlT3V0KCk7XHJcbiAgICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICB4LmNsYXNzTGlzdC5yZW1vdmUoXCJmYS1zdGFyLW9cIilcclxuICAgICAgICAgICAgeC5jbGFzc0xpc3QuYWRkKFwiZmEtc3RhclwiKVxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsICAgIC8vWW91ciBhcGkgdXJsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdQVVQnLCAgIC8vdHlwZSBpcyBhbnkgSFRUUCBtZXRob2RcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgICAgICAvL0RhdGEgYXMganMgb2JqZWN0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgO1xyXG4gICAgICAgICB9XHJcblxyXG4gICAgfSBlbHNlIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwiZmEtc3RhclwiKSl7XHJcblxyXG4gICAgICAgIHguY2xhc3NMaXN0LnJlbW92ZShcImZhLXN0YXJcIilcclxuICAgICAgICB4LmNsYXNzTGlzdC5hZGQoXCJmYS1zdGFyLW9cIilcclxuICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgICAgIHVybDogYXBpX3VybCxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnREVMRVRFJyxcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG8gc29tZXRoaW5nIHdpdGggdGhlIHJlc3VsdFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICA7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG4kKCcuY2xvc2UtaWNvbicpLm9uKCdjbGljaycsZnVuY3Rpb24oKSB7XHJcbiAgJCh0aGlzKS5jbG9zZXN0KCcuY2FyZCcpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcclxuICAkKFwiI3Jlc3RhdXJhbnRcIikuZmFkZUluKCk7XHJcbn0pXHJcblxyXG5cclxuXHJcbiIsIihmdW5jdGlvbigkKXtcInVzZSBzdHJpY3RcIjt2YXIgTWFnaWNTdWdnZXN0PWZ1bmN0aW9uKGVsZW1lbnQsb3B0aW9ucyl7dmFyIG1zPXRoaXM7dmFyIGRlZmF1bHRzPXthbGxvd0ZyZWVFbnRyaWVzOnRydWUsYWxsb3dEdXBsaWNhdGVzOmZhbHNlLGFqYXhDb25maWc6e30sYXV0b1NlbGVjdDp0cnVlLHNlbGVjdEZpcnN0OmZhbHNlLHF1ZXJ5UGFyYW06XCJxdWVyeVwiLGJlZm9yZVNlbmQ6ZnVuY3Rpb24oKXt9LGNsczpcIlwiLGRhdGE6bnVsbCxkYXRhVXJsUGFyYW1zOnt9LGRpc2FibGVkOmZhbHNlLGRpc2FibGVkRmllbGQ6bnVsbCxkaXNwbGF5RmllbGQ6XCJuYW1lXCIsZWRpdGFibGU6dHJ1ZSxleHBhbmRlZDpmYWxzZSxleHBhbmRPbkZvY3VzOmZhbHNlLGdyb3VwQnk6bnVsbCxoaWRlVHJpZ2dlcjpmYWxzZSxoaWdobGlnaHQ6dHJ1ZSxpZDpudWxsLGluZm9Nc2dDbHM6XCJcIixpbnB1dENmZzp7fSxpbnZhbGlkQ2xzOlwibXMtaW52XCIsbWF0Y2hDYXNlOmZhbHNlLG1heERyb3BIZWlnaHQ6MjkwLG1heEVudHJ5TGVuZ3RoOm51bGwsbWF4RW50cnlSZW5kZXJlcjpmdW5jdGlvbih2KXtyZXR1cm5cIlBsZWFzZSByZWR1Y2UgeW91ciBlbnRyeSBieSBcIit2K1wiIGNoYXJhY3RlclwiKyh2PjE/XCJzXCI6XCJcIil9LG1heFN1Z2dlc3Rpb25zOm51bGwsbWF4U2VsZWN0aW9uOjEwLG1heFNlbGVjdGlvblJlbmRlcmVyOmZ1bmN0aW9uKHYpe3JldHVyblwiWW91IGNhbm5vdCBjaG9vc2UgbW9yZSB0aGFuIFwiK3YrXCIgaXRlbVwiKyh2PjE/XCJzXCI6XCJcIil9LG1ldGhvZDpcIlBPU1RcIixtaW5DaGFyczowLG1pbkNoYXJzUmVuZGVyZXI6ZnVuY3Rpb24odil7cmV0dXJuXCJQbGVhc2UgdHlwZSBcIit2K1wiIG1vcmUgY2hhcmFjdGVyXCIrKHY+MT9cInNcIjpcIlwiKX0sbW9kZTpcImxvY2FsXCIsbmFtZTpudWxsLG5vU3VnZ2VzdGlvblRleHQ6XCJObyBzdWdnZXN0aW9uc1wiLHBsYWNlaG9sZGVyOlwiVHlwZSBvciBjbGljayBoZXJlXCIscmVuZGVyZXI6bnVsbCxyZXF1aXJlZDpmYWxzZSxyZXN1bHRBc1N0cmluZzpmYWxzZSxyZXN1bHRBc1N0cmluZ0RlbGltaXRlcjpcIixcIixyZXN1bHRzRmllbGQ6XCJyZXN1bHRzXCIsc2VsZWN0aW9uQ2xzOlwiXCIsc2VsZWN0aW9uQ29udGFpbmVyOm51bGwsc2VsZWN0aW9uUG9zaXRpb246XCJpbm5lclwiLHNlbGVjdGlvblJlbmRlcmVyOm51bGwsc2VsZWN0aW9uU3RhY2tlZDpmYWxzZSxzb3J0RGlyOlwiYXNjXCIsc29ydE9yZGVyOm51bGwsc3RyaWN0U3VnZ2VzdDpmYWxzZSxzdHlsZTpcIlwiLHRvZ2dsZU9uQ2xpY2s6ZmFsc2UsdHlwZURlbGF5OjQwMCx1c2VUYWJLZXk6ZmFsc2UsdXNlQ29tbWFLZXk6dHJ1ZSx1c2VaZWJyYVN0eWxlOmZhbHNlLHZhbHVlOm51bGwsdmFsdWVGaWVsZDpcImlkXCIsdnJlZ2V4Om51bGwsdnR5cGU6bnVsbH07dmFyIGNvbmY9JC5leHRlbmQoe30sb3B0aW9ucyk7dmFyIGNmZz0kLmV4dGVuZCh0cnVlLHt9LGRlZmF1bHRzLGNvbmYpO3RoaXMuYWRkVG9TZWxlY3Rpb249ZnVuY3Rpb24oaXRlbXMsaXNTaWxlbnQpe2lmKCFjZmcubWF4U2VsZWN0aW9ufHxfc2VsZWN0aW9uLmxlbmd0aDxjZmcubWF4U2VsZWN0aW9uKXtpZighJC5pc0FycmF5KGl0ZW1zKSl7aXRlbXM9W2l0ZW1zXX12YXIgdmFsdWVjaGFuZ2VkPWZhbHNlOyQuZWFjaChpdGVtcyxmdW5jdGlvbihpbmRleCxqc29uKXtpZihjZmcuYWxsb3dEdXBsaWNhdGVzfHwkLmluQXJyYXkoanNvbltjZmcudmFsdWVGaWVsZF0sbXMuZ2V0VmFsdWUoKSk9PT0tMSl7X3NlbGVjdGlvbi5wdXNoKGpzb24pO3ZhbHVlY2hhbmdlZD10cnVlfX0pO2lmKHZhbHVlY2hhbmdlZD09PXRydWUpe3NlbGYuX3JlbmRlclNlbGVjdGlvbigpO3RoaXMuZW1wdHkoKTtpZihpc1NpbGVudCE9PXRydWUpeyQodGhpcykudHJpZ2dlcihcInNlbGVjdGlvbmNoYW5nZVwiLFt0aGlzLHRoaXMuZ2V0U2VsZWN0aW9uKCldKX19fXRoaXMuaW5wdXQuYXR0cihcInBsYWNlaG9sZGVyXCIsY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiJiZ0aGlzLmdldFZhbHVlKCkubGVuZ3RoPjA/XCJcIjpjZmcucGxhY2Vob2xkZXIpfTt0aGlzLmNsZWFyPWZ1bmN0aW9uKGlzU2lsZW50KXt0aGlzLnJlbW92ZUZyb21TZWxlY3Rpb24oX3NlbGVjdGlvbi5zbGljZSgwKSxpc1NpbGVudCl9O3RoaXMuY29sbGFwc2U9ZnVuY3Rpb24oKXtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXt0aGlzLmNvbWJvYm94LmRldGFjaCgpO2NmZy5leHBhbmRlZD1mYWxzZTskKHRoaXMpLnRyaWdnZXIoXCJjb2xsYXBzZVwiLFt0aGlzXSl9fTt0aGlzLmRpc2FibGU9ZnVuY3Rpb24oKXt0aGlzLmNvbnRhaW5lci5hZGRDbGFzcyhcIm1zLWN0bi1kaXNhYmxlZFwiKTtjZmcuZGlzYWJsZWQ9dHJ1ZTttcy5pbnB1dC5hdHRyKFwiZGlzYWJsZWRcIix0cnVlKX07dGhpcy5lbXB0eT1mdW5jdGlvbigpe3RoaXMuaW5wdXQudmFsKFwiXCIpfTt0aGlzLmVuYWJsZT1mdW5jdGlvbigpe3RoaXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKFwibXMtY3RuLWRpc2FibGVkXCIpO2NmZy5kaXNhYmxlZD1mYWxzZTttcy5pbnB1dC5hdHRyKFwiZGlzYWJsZWRcIixmYWxzZSl9O3RoaXMuZXhwYW5kPWZ1bmN0aW9uKCl7aWYoIWNmZy5leHBhbmRlZCYmKHRoaXMuaW5wdXQudmFsKCkubGVuZ3RoPj1jZmcubWluQ2hhcnN8fHRoaXMuY29tYm9ib3guY2hpbGRyZW4oKS5zaXplKCk+MCkpe3RoaXMuY29tYm9ib3guYXBwZW5kVG8odGhpcy5jb250YWluZXIpO3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO2NmZy5leHBhbmRlZD10cnVlOyQodGhpcykudHJpZ2dlcihcImV4cGFuZFwiLFt0aGlzXSl9fTt0aGlzLmlzRGlzYWJsZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gY2ZnLmRpc2FibGVkfTt0aGlzLmlzVmFsaWQ9ZnVuY3Rpb24oKXt2YXIgdmFsaWQ9Y2ZnLnJlcXVpcmVkPT09ZmFsc2V8fF9zZWxlY3Rpb24ubGVuZ3RoPjA7aWYoY2ZnLnZ0eXBlfHxjZmcudnJlZ2V4KXskLmVhY2goX3NlbGVjdGlvbixmdW5jdGlvbihpbmRleCxpdGVtKXt2YWxpZD12YWxpZCYmc2VsZi5fdmFsaWRhdGVTaW5nbGVJdGVtKGl0ZW1bY2ZnLnZhbHVlRmllbGRdKX0pfXJldHVybiB2YWxpZH07dGhpcy5nZXREYXRhVXJsUGFyYW1zPWZ1bmN0aW9uKCl7cmV0dXJuIGNmZy5kYXRhVXJsUGFyYW1zfTt0aGlzLmdldE5hbWU9ZnVuY3Rpb24oKXtyZXR1cm4gY2ZnLm5hbWV9O3RoaXMuZ2V0U2VsZWN0aW9uPWZ1bmN0aW9uKCl7cmV0dXJuIF9zZWxlY3Rpb259O3RoaXMuZ2V0UmF3VmFsdWU9ZnVuY3Rpb24oKXtyZXR1cm4gbXMuaW5wdXQudmFsKCl9O3RoaXMuZ2V0VmFsdWU9ZnVuY3Rpb24oKXtyZXR1cm4gJC5tYXAoX3NlbGVjdGlvbixmdW5jdGlvbihvKXtyZXR1cm4gb1tjZmcudmFsdWVGaWVsZF19KX07dGhpcy5yZW1vdmVGcm9tU2VsZWN0aW9uPWZ1bmN0aW9uKGl0ZW1zLGlzU2lsZW50KXtpZighJC5pc0FycmF5KGl0ZW1zKSl7aXRlbXM9W2l0ZW1zXX12YXIgdmFsdWVjaGFuZ2VkPWZhbHNlOyQuZWFjaChpdGVtcyxmdW5jdGlvbihpbmRleCxqc29uKXt2YXIgaT0kLmluQXJyYXkoanNvbltjZmcudmFsdWVGaWVsZF0sbXMuZ2V0VmFsdWUoKSk7aWYoaT4tMSl7X3NlbGVjdGlvbi5zcGxpY2UoaSwxKTt2YWx1ZWNoYW5nZWQ9dHJ1ZX19KTtpZih2YWx1ZWNoYW5nZWQ9PT10cnVlKXtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtpZihpc1NpbGVudCE9PXRydWUpeyQodGhpcykudHJpZ2dlcihcInNlbGVjdGlvbmNoYW5nZVwiLFt0aGlzLHRoaXMuZ2V0U2VsZWN0aW9uKCldKX1pZihjZmcuZXhwYW5kT25Gb2N1cyl7bXMuZXhwYW5kKCl9aWYoY2ZnLmV4cGFuZGVkKXtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKX19dGhpcy5pbnB1dC5hdHRyKFwicGxhY2Vob2xkZXJcIixjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJnRoaXMuZ2V0VmFsdWUoKS5sZW5ndGg+MD9cIlwiOmNmZy5wbGFjZWhvbGRlcil9O3RoaXMuZ2V0RGF0YT1mdW5jdGlvbigpe3JldHVybiBfY2JEYXRhfTt0aGlzLnNldERhdGE9ZnVuY3Rpb24oZGF0YSl7Y2ZnLmRhdGE9ZGF0YTtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKX07dGhpcy5zZXROYW1lPWZ1bmN0aW9uKG5hbWUpe2NmZy5uYW1lPW5hbWU7aWYobmFtZSl7Y2ZnLm5hbWUrPW5hbWUuaW5kZXhPZihcIltdXCIpPjA/XCJcIjpcIltdXCJ9aWYobXMuX3ZhbHVlQ29udGFpbmVyKXskLmVhY2gobXMuX3ZhbHVlQ29udGFpbmVyLmNoaWxkcmVuKCksZnVuY3Rpb24oaSxlbCl7ZWwubmFtZT1jZmcubmFtZX0pfX07dGhpcy5zZXRTZWxlY3Rpb249ZnVuY3Rpb24oaXRlbXMpe3RoaXMuY2xlYXIoKTt0aGlzLmFkZFRvU2VsZWN0aW9uKGl0ZW1zKX07dGhpcy5zZXRWYWx1ZT1mdW5jdGlvbih2YWx1ZXMpe3ZhciBpdGVtcz1bXTskLmVhY2godmFsdWVzLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXt2YXIgZm91bmQ9ZmFsc2U7JC5lYWNoKF9jYkRhdGEsZnVuY3Rpb24oaSxpdGVtKXtpZihpdGVtW2NmZy52YWx1ZUZpZWxkXT09dmFsdWUpe2l0ZW1zLnB1c2goaXRlbSk7Zm91bmQ9dHJ1ZTtyZXR1cm4gZmFsc2V9fSk7aWYoIWZvdW5kKXtpZih0eXBlb2YgdmFsdWU9PT1cIm9iamVjdFwiKXtpdGVtcy5wdXNoKHZhbHVlKX1lbHNle3ZhciBqc29uPXt9O2pzb25bY2ZnLnZhbHVlRmllbGRdPXZhbHVlO2pzb25bY2ZnLmRpc3BsYXlGaWVsZF09dmFsdWU7aXRlbXMucHVzaChqc29uKX19fSk7aWYoaXRlbXMubGVuZ3RoPjApe3RoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpfX07dGhpcy5zZXREYXRhVXJsUGFyYW1zPWZ1bmN0aW9uKHBhcmFtcyl7Y2ZnLmRhdGFVcmxQYXJhbXM9JC5leHRlbmQoe30scGFyYW1zKX07dmFyIF9zZWxlY3Rpb249W10sX2NvbWJvSXRlbUhlaWdodD0wLF90aW1lcixfaGFzRm9jdXM9ZmFsc2UsX2dyb3Vwcz1udWxsLF9jYkRhdGE9W10sX2N0cmxEb3duPWZhbHNlLEtFWUNPREVTPXtCQUNLU1BBQ0U6OCxUQUI6OSxFTlRFUjoxMyxDVFJMOjE3LEVTQzoyNyxTUEFDRTozMixVUEFSUk9XOjM4LERPV05BUlJPVzo0MCxDT01NQToxODh9O3ZhciBzZWxmPXtfZGlzcGxheVN1Z2dlc3Rpb25zOmZ1bmN0aW9uKGRhdGEpe21zLmNvbWJvYm94LnNob3coKTttcy5jb21ib2JveC5lbXB0eSgpO3ZhciByZXNIZWlnaHQ9MCxuYkdyb3Vwcz0wO2lmKF9ncm91cHM9PT1udWxsKXtzZWxmLl9yZW5kZXJDb21ib0l0ZW1zKGRhdGEpO3Jlc0hlaWdodD1fY29tYm9JdGVtSGVpZ2h0KmRhdGEubGVuZ3RofWVsc2V7Zm9yKHZhciBncnBOYW1lIGluIF9ncm91cHMpe25iR3JvdXBzKz0xOyQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtcmVzLWdyb3VwXCIsaHRtbDpncnBOYW1lfSkuYXBwZW5kVG8obXMuY29tYm9ib3gpO3NlbGYuX3JlbmRlckNvbWJvSXRlbXMoX2dyb3Vwc1tncnBOYW1lXS5pdGVtcyx0cnVlKX12YXIgX2dyb3VwSXRlbUhlaWdodD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1ncm91cFwiKS5vdXRlckhlaWdodCgpO2lmKF9ncm91cEl0ZW1IZWlnaHQhPT1udWxsKXt2YXIgdG1wUmVzSGVpZ2h0PW5iR3JvdXBzKl9ncm91cEl0ZW1IZWlnaHQ7cmVzSGVpZ2h0PV9jb21ib0l0ZW1IZWlnaHQqZGF0YS5sZW5ndGgrdG1wUmVzSGVpZ2h0fWVsc2V7cmVzSGVpZ2h0PV9jb21ib0l0ZW1IZWlnaHQqKGRhdGEubGVuZ3RoK25iR3JvdXBzKX19aWYocmVzSGVpZ2h0PG1zLmNvbWJvYm94LmhlaWdodCgpfHxyZXNIZWlnaHQ8PWNmZy5tYXhEcm9wSGVpZ2h0KXttcy5jb21ib2JveC5oZWlnaHQocmVzSGVpZ2h0KX1lbHNlIGlmKHJlc0hlaWdodD49bXMuY29tYm9ib3guaGVpZ2h0KCkmJnJlc0hlaWdodD5jZmcubWF4RHJvcEhlaWdodCl7bXMuY29tYm9ib3guaGVpZ2h0KGNmZy5tYXhEcm9wSGVpZ2h0KX1pZihkYXRhLmxlbmd0aD09PTEmJmNmZy5hdXRvU2VsZWN0PT09dHJ1ZSl7bXMuY29tYm9ib3guY2hpbGRyZW4oKS5maWx0ZXIoXCI6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6bGFzdFwiKS5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKX1pZihjZmcuc2VsZWN0Rmlyc3Q9PT10cnVlKXttcy5jb21ib2JveC5jaGlsZHJlbigpLmZpbHRlcihcIjpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdFwiKS5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKX1pZihkYXRhLmxlbmd0aD09PTAmJm1zLmdldFJhd1ZhbHVlKCkhPT1cIlwiKXt2YXIgbm9TdWdnZXN0aW9uVGV4dD1jZmcubm9TdWdnZXN0aW9uVGV4dC5yZXBsYWNlKC9cXHtcXHsuKlxcfVxcfS8sbXMuaW5wdXQudmFsKCkpO3NlbGYuX3VwZGF0ZUhlbHBlcihub1N1Z2dlc3Rpb25UZXh0KTttcy5jb2xsYXBzZSgpfWlmKGNmZy5hbGxvd0ZyZWVFbnRyaWVzPT09ZmFsc2Upe2lmKGRhdGEubGVuZ3RoPT09MCl7JChtcy5pbnB1dCkuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpO21zLmNvbWJvYm94LmhpZGUoKX1lbHNleyQobXMuaW5wdXQpLnJlbW92ZUNsYXNzKGNmZy5pbnZhbGlkQ2xzKX19fSxfZ2V0RW50cmllc0Zyb21TdHJpbmdBcnJheTpmdW5jdGlvbihkYXRhKXt2YXIganNvbj1bXTskLmVhY2goZGF0YSxmdW5jdGlvbihpbmRleCxzKXt2YXIgZW50cnk9e307ZW50cnlbY2ZnLmRpc3BsYXlGaWVsZF09ZW50cnlbY2ZnLnZhbHVlRmllbGRdPSQudHJpbShzKTtqc29uLnB1c2goZW50cnkpfSk7cmV0dXJuIGpzb259LF9oaWdobGlnaHRTdWdnZXN0aW9uOmZ1bmN0aW9uKGh0bWwpe3ZhciBxPW1zLmlucHV0LnZhbCgpO3ZhciBzcGVjaWFsQ2hhcmFjdGVycz1bXCJeXCIsXCIkXCIsXCIqXCIsXCIrXCIsXCI/XCIsXCIuXCIsXCIoXCIsXCIpXCIsXCI6XCIsXCIhXCIsXCJ8XCIsXCJ7XCIsXCJ9XCIsXCJbXCIsXCJdXCJdOyQuZWFjaChzcGVjaWFsQ2hhcmFjdGVycyxmdW5jdGlvbihpbmRleCx2YWx1ZSl7cT1xLnJlcGxhY2UodmFsdWUsXCJcXFxcXCIrdmFsdWUpfSk7aWYocS5sZW5ndGg9PT0wKXtyZXR1cm4gaHRtbH12YXIgZ2xvYj1jZmcubWF0Y2hDYXNlPT09dHJ1ZT9cImdcIjpcImdpXCI7cmV0dXJuIGh0bWwucmVwbGFjZShuZXcgUmVnRXhwKFwiKFwiK3ErXCIpKD8hKFtePF0rKT8+KVwiLGdsb2IpLFwiPGVtPiQxPC9lbT5cIil9LF9tb3ZlU2VsZWN0ZWRSb3c6ZnVuY3Rpb24oZGlyKXtpZighY2ZnLmV4cGFuZGVkKXttcy5leHBhbmQoKX12YXIgbGlzdCxzdGFydCxhY3RpdmUsc2Nyb2xsUG9zO2xpc3Q9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKVwiKTtpZihkaXI9PT1cImRvd25cIil7c3RhcnQ9bGlzdC5lcSgwKX1lbHNle3N0YXJ0PWxpc3QuZmlsdGVyKFwiOmxhc3RcIil9YWN0aXZlPW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpO2lmKGFjdGl2ZS5sZW5ndGg+MCl7aWYoZGlyPT09XCJkb3duXCIpe3N0YXJ0PWFjdGl2ZS5uZXh0QWxsKFwiLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpXCIpLmZpcnN0KCk7aWYoc3RhcnQubGVuZ3RoPT09MCl7c3RhcnQ9bGlzdC5lcSgwKX1zY3JvbGxQb3M9bXMuY29tYm9ib3guc2Nyb2xsVG9wKCk7bXMuY29tYm9ib3guc2Nyb2xsVG9wKDApO2lmKHN0YXJ0WzBdLm9mZnNldFRvcCtzdGFydC5vdXRlckhlaWdodCgpPm1zLmNvbWJvYm94LmhlaWdodCgpKXttcy5jb21ib2JveC5zY3JvbGxUb3Aoc2Nyb2xsUG9zK19jb21ib0l0ZW1IZWlnaHQpfX1lbHNle3N0YXJ0PWFjdGl2ZS5wcmV2QWxsKFwiLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpXCIpLmZpcnN0KCk7aWYoc3RhcnQubGVuZ3RoPT09MCl7c3RhcnQ9bGlzdC5maWx0ZXIoXCI6bGFzdFwiKTttcy5jb21ib2JveC5zY3JvbGxUb3AoX2NvbWJvSXRlbUhlaWdodCpsaXN0Lmxlbmd0aCl9aWYoc3RhcnRbMF0ub2Zmc2V0VG9wPG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpKXttcy5jb21ib2JveC5zY3JvbGxUb3AobXMuY29tYm9ib3guc2Nyb2xsVG9wKCktX2NvbWJvSXRlbUhlaWdodCl9fX1saXN0LnJlbW92ZUNsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpO3N0YXJ0LmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpfSxfcHJvY2Vzc1N1Z2dlc3Rpb25zOmZ1bmN0aW9uKHNvdXJjZSl7dmFyIGpzb249bnVsbCxkYXRhPXNvdXJjZXx8Y2ZnLmRhdGE7aWYoZGF0YSE9PW51bGwpe2lmKHR5cGVvZiBkYXRhPT09XCJmdW5jdGlvblwiKXtkYXRhPWRhdGEuY2FsbChtcyxtcy5nZXRSYXdWYWx1ZSgpKX1pZih0eXBlb2YgZGF0YT09PVwic3RyaW5nXCIpeyQobXMpLnRyaWdnZXIoXCJiZWZvcmVsb2FkXCIsW21zXSk7dmFyIHF1ZXJ5UGFyYW1zPXt9O3F1ZXJ5UGFyYW1zW2NmZy5xdWVyeVBhcmFtXT1tcy5pbnB1dC52YWwoKTt2YXIgcGFyYW1zPSQuZXh0ZW5kKHF1ZXJ5UGFyYW1zLGNmZy5kYXRhVXJsUGFyYW1zKTskLmFqYXgoJC5leHRlbmQoe3R5cGU6Y2ZnLm1ldGhvZCx1cmw6ZGF0YSxkYXRhOnBhcmFtcyxiZWZvcmVTZW5kOmNmZy5iZWZvcmVTZW5kLHN1Y2Nlc3M6ZnVuY3Rpb24oYXN5bmNEYXRhKXtqc29uPXR5cGVvZiBhc3luY0RhdGE9PT1cInN0cmluZ1wiP0pTT04ucGFyc2UoYXN5bmNEYXRhKTphc3luY0RhdGE7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKGpzb24pOyQobXMpLnRyaWdnZXIoXCJsb2FkXCIsW21zLGpzb25dKTtpZihzZWxmLl9hc3luY1ZhbHVlcyl7bXMuc2V0VmFsdWUodHlwZW9mIHNlbGYuX2FzeW5jVmFsdWVzPT09XCJzdHJpbmdcIj9KU09OLnBhcnNlKHNlbGYuX2FzeW5jVmFsdWVzKTpzZWxmLl9hc3luY1ZhbHVlcyk7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7ZGVsZXRlIHNlbGYuX2FzeW5jVmFsdWVzfX0sZXJyb3I6ZnVuY3Rpb24oKXt0aHJvd1wiQ291bGQgbm90IHJlYWNoIHNlcnZlclwifX0sY2ZnLmFqYXhDb25maWcpKTtyZXR1cm59ZWxzZXtpZihkYXRhLmxlbmd0aD4wJiZ0eXBlb2YgZGF0YVswXT09PVwic3RyaW5nXCIpe19jYkRhdGE9c2VsZi5fZ2V0RW50cmllc0Zyb21TdHJpbmdBcnJheShkYXRhKX1lbHNle19jYkRhdGE9ZGF0YVtjZmcucmVzdWx0c0ZpZWxkXXx8ZGF0YX19dmFyIHNvcnRlZERhdGE9Y2ZnLm1vZGU9PT1cInJlbW90ZVwiP19jYkRhdGE6c2VsZi5fc29ydEFuZFRyaW0oX2NiRGF0YSk7c2VsZi5fZGlzcGxheVN1Z2dlc3Rpb25zKHNlbGYuX2dyb3VwKHNvcnRlZERhdGEpKX19LF9yZW5kZXI6ZnVuY3Rpb24oZWwpe21zLnNldE5hbWUoY2ZnLm5hbWUpO21zLmNvbnRhaW5lcj0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLWN0biBmb3JtLWNvbnRyb2wgXCIrKGNmZy5yZXN1bHRBc1N0cmluZz9cIm1zLWFzLXN0cmluZyBcIjpcIlwiKStjZmcuY2xzKygkKGVsKS5oYXNDbGFzcyhcImlucHV0LWxnXCIpP1wiIGlucHV0LWxnXCI6XCJcIikrKCQoZWwpLmhhc0NsYXNzKFwiaW5wdXQtc21cIik/XCIgaW5wdXQtc21cIjpcIlwiKSsoY2ZnLmRpc2FibGVkPT09dHJ1ZT9cIiBtcy1jdG4tZGlzYWJsZWRcIjpcIlwiKSsoY2ZnLmVkaXRhYmxlPT09dHJ1ZT9cIlwiOlwiIG1zLWN0bi1yZWFkb25seVwiKSsoY2ZnLmhpZGVUcmlnZ2VyPT09ZmFsc2U/XCJcIjpcIiBtcy1uby10cmlnZ2VyXCIpLHN0eWxlOmNmZy5zdHlsZSxpZDpjZmcuaWR9KTttcy5jb250YWluZXIuZm9jdXMoJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cyx0aGlzKSk7bXMuY29udGFpbmVyLmJsdXIoJC5wcm94eShoYW5kbGVycy5fb25CbHVyLHRoaXMpKTttcy5jb250YWluZXIua2V5ZG93bigkLnByb3h5KGhhbmRsZXJzLl9vbktleURvd24sdGhpcykpO21zLmNvbnRhaW5lci5rZXl1cCgkLnByb3h5KGhhbmRsZXJzLl9vbktleVVwLHRoaXMpKTttcy5pbnB1dD0kKFwiPGlucHV0Lz5cIiwkLmV4dGVuZCh7dHlwZTpcInRleHRcIixcImNsYXNzXCI6Y2ZnLmVkaXRhYmxlPT09dHJ1ZT9cIlwiOlwiIG1zLWlucHV0LXJlYWRvbmx5XCIscmVhZG9ubHk6IWNmZy5lZGl0YWJsZSxwbGFjZWhvbGRlcjpjZmcucGxhY2Vob2xkZXIsZGlzYWJsZWQ6Y2ZnLmRpc2FibGVkfSxjZmcuaW5wdXRDZmcpKTttcy5pbnB1dC5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbklucHV0Rm9jdXMsdGhpcykpO21zLmlucHV0LmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRDbGljayx0aGlzKSk7bXMuY29tYm9ib3g9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1yZXMtY3RuIGRyb3Bkb3duLW1lbnVcIn0pLmhlaWdodChjZmcubWF4RHJvcEhlaWdodCk7bXMuY29tYm9ib3gub24oXCJjbGlja1wiLFwiZGl2Lm1zLXJlcy1pdGVtXCIsJC5wcm94eShoYW5kbGVycy5fb25Db21ib0l0ZW1TZWxlY3RlZCx0aGlzKSk7bXMuY29tYm9ib3gub24oXCJtb3VzZW92ZXJcIixcImRpdi5tcy1yZXMtaXRlbVwiLCQucHJveHkoaGFuZGxlcnMuX29uQ29tYm9JdGVtTW91c2VPdmVyLHRoaXMpKTtpZihjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXttcy5zZWxlY3Rpb25Db250YWluZXI9Y2ZnLnNlbGVjdGlvbkNvbnRhaW5lcjskKG1zLnNlbGVjdGlvbkNvbnRhaW5lcikuYWRkQ2xhc3MoXCJtcy1zZWwtY3RuXCIpfWVsc2V7bXMuc2VsZWN0aW9uQ29udGFpbmVyPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtc2VsLWN0blwifSl9bXMuc2VsZWN0aW9uQ29udGFpbmVyLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uRm9jdXMsdGhpcykpO2lmKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe21zLnNlbGVjdGlvbkNvbnRhaW5lci5hcHBlbmQobXMuaW5wdXQpfWVsc2V7bXMuY29udGFpbmVyLmFwcGVuZChtcy5pbnB1dCl9bXMuaGVscGVyPSQoXCI8c3Bhbi8+XCIse1wiY2xhc3NcIjpcIm1zLWhlbHBlciBcIitjZmcuaW5mb01zZ0Nsc30pO3NlbGYuX3VwZGF0ZUhlbHBlcigpO21zLmNvbnRhaW5lci5hcHBlbmQobXMuaGVscGVyKTskKGVsKS5yZXBsYWNlV2l0aChtcy5jb250YWluZXIpO2lmKCFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXtzd2l0Y2goY2ZnLnNlbGVjdGlvblBvc2l0aW9uKXtjYXNlXCJib3R0b21cIjptcy5zZWxlY3Rpb25Db250YWluZXIuaW5zZXJ0QWZ0ZXIobXMuY29udGFpbmVyKTtpZihjZmcuc2VsZWN0aW9uU3RhY2tlZD09PXRydWUpe21zLnNlbGVjdGlvbkNvbnRhaW5lci53aWR0aChtcy5jb250YWluZXIud2lkdGgoKSk7bXMuc2VsZWN0aW9uQ29udGFpbmVyLmFkZENsYXNzKFwibXMtc3RhY2tlZFwiKX1icmVhaztjYXNlXCJyaWdodFwiOm1zLnNlbGVjdGlvbkNvbnRhaW5lci5pbnNlcnRBZnRlcihtcy5jb250YWluZXIpO21zLmNvbnRhaW5lci5jc3MoXCJmbG9hdFwiLFwibGVmdFwiKTticmVhaztkZWZhdWx0Om1zLmNvbnRhaW5lci5hcHBlbmQobXMuc2VsZWN0aW9uQ29udGFpbmVyKTticmVha319aWYoY2ZnLmhpZGVUcmlnZ2VyPT09ZmFsc2Upe21zLnRyaWdnZXI9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy10cmlnZ2VyXCIsaHRtbDonPGRpdiBjbGFzcz1cIm1zLXRyaWdnZXItaWNvXCI+PC9kaXY+J30pO21zLnRyaWdnZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25UcmlnZ2VyQ2xpY2ssdGhpcykpO21zLmNvbnRhaW5lci5hcHBlbmQobXMudHJpZ2dlcil9JCh3aW5kb3cpLnJlc2l6ZSgkLnByb3h5KGhhbmRsZXJzLl9vbldpbmRvd1Jlc2l6ZWQsdGhpcykpO2lmKGNmZy52YWx1ZSE9PW51bGx8fGNmZy5kYXRhIT09bnVsbCl7aWYodHlwZW9mIGNmZy5kYXRhPT09XCJzdHJpbmdcIil7c2VsZi5fYXN5bmNWYWx1ZXM9Y2ZnLnZhbHVlO3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfWVsc2V7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7aWYoY2ZnLnZhbHVlIT09bnVsbCl7bXMuc2V0VmFsdWUoY2ZnLnZhbHVlKTtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKX19fSQoXCJib2R5XCIpLmNsaWNrKGZ1bmN0aW9uKGUpe2lmKG1zLmNvbnRhaW5lci5oYXNDbGFzcyhcIm1zLWN0bi1mb2N1c1wiKSYmbXMuY29udGFpbmVyLmhhcyhlLnRhcmdldCkubGVuZ3RoPT09MCYmZS50YXJnZXQuY2xhc3NOYW1lLmluZGV4T2YoXCJtcy1yZXMtaXRlbVwiKTwwJiZlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZihcIm1zLWNsb3NlLWJ0blwiKTwwJiZtcy5jb250YWluZXJbMF0hPT1lLnRhcmdldCl7aGFuZGxlcnMuX29uQmx1cigpfX0pO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe2NmZy5leHBhbmRlZD1mYWxzZTttcy5leHBhbmQoKX19LF9yZW5kZXJDb21ib0l0ZW1zOmZ1bmN0aW9uKGl0ZW1zLGlzR3JvdXBlZCl7dmFyIHJlZj10aGlzLGh0bWw9XCJcIjskLmVhY2goaXRlbXMsZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBkaXNwbGF5ZWQ9Y2ZnLnJlbmRlcmVyIT09bnVsbD9jZmcucmVuZGVyZXIuY2FsbChyZWYsdmFsdWUpOnZhbHVlW2NmZy5kaXNwbGF5RmllbGRdO3ZhciBkaXNhYmxlZD1jZmcuZGlzYWJsZWRGaWVsZCE9PW51bGwmJnZhbHVlW2NmZy5kaXNhYmxlZEZpZWxkXT09PXRydWU7dmFyIHJlc3VsdEl0ZW1FbD0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXJlcy1pdGVtIFwiKyhpc0dyb3VwZWQ/XCJtcy1yZXMtaXRlbS1ncm91cGVkIFwiOlwiXCIpKyhkaXNhYmxlZD9cIm1zLXJlcy1pdGVtLWRpc2FibGVkIFwiOlwiXCIpKyhpbmRleCUyPT09MSYmY2ZnLnVzZVplYnJhU3R5bGU9PT10cnVlP1wibXMtcmVzLW9kZFwiOlwiXCIpLGh0bWw6Y2ZnLmhpZ2hsaWdodD09PXRydWU/c2VsZi5faGlnaGxpZ2h0U3VnZ2VzdGlvbihkaXNwbGF5ZWQpOmRpc3BsYXllZCxcImRhdGEtanNvblwiOkpTT04uc3RyaW5naWZ5KHZhbHVlKX0pO2h0bWwrPSQoXCI8ZGl2Lz5cIikuYXBwZW5kKHJlc3VsdEl0ZW1FbCkuaHRtbCgpfSk7bXMuY29tYm9ib3guYXBwZW5kKGh0bWwpO19jb21ib0l0ZW1IZWlnaHQ9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbTpmaXJzdFwiKS5vdXRlckhlaWdodCgpfSxfcmVuZGVyU2VsZWN0aW9uOmZ1bmN0aW9uKCl7dmFyIHJlZj10aGlzLHc9MCxpbnB1dE9mZnNldD0wLGl0ZW1zPVtdLGFzVGV4dD1jZmcucmVzdWx0QXNTdHJpbmc9PT10cnVlJiYhX2hhc0ZvY3VzO21zLnNlbGVjdGlvbkNvbnRhaW5lci5maW5kKFwiLm1zLXNlbC1pdGVtXCIpLnJlbW92ZSgpO2lmKG1zLl92YWx1ZUNvbnRhaW5lciE9PXVuZGVmaW5lZCl7bXMuX3ZhbHVlQ29udGFpbmVyLnJlbW92ZSgpfSQuZWFjaChfc2VsZWN0aW9uLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXt2YXIgc2VsZWN0ZWRJdGVtRWwsZGVsSXRlbUVsLHNlbGVjdGVkSXRlbUh0bWw9Y2ZnLnNlbGVjdGlvblJlbmRlcmVyIT09bnVsbD9jZmcuc2VsZWN0aW9uUmVuZGVyZXIuY2FsbChyZWYsdmFsdWUpOnZhbHVlW2NmZy5kaXNwbGF5RmllbGRdO3ZhciB2YWxpZENscz1zZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0odmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF0pP1wiXCI6XCIgbXMtc2VsLWludmFsaWRcIjtpZihhc1RleHQ9PT10cnVlKXtzZWxlY3RlZEl0ZW1FbD0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXNlbC1pdGVtIG1zLXNlbC10ZXh0IFwiK2NmZy5zZWxlY3Rpb25DbHMrdmFsaWRDbHMsaHRtbDpzZWxlY3RlZEl0ZW1IdG1sKyhpbmRleD09PV9zZWxlY3Rpb24ubGVuZ3RoLTE/XCJcIjpjZmcucmVzdWx0QXNTdHJpbmdEZWxpbWl0ZXIpfSkuZGF0YShcImpzb25cIix2YWx1ZSl9ZWxzZXtzZWxlY3RlZEl0ZW1FbD0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXNlbC1pdGVtIFwiK2NmZy5zZWxlY3Rpb25DbHMrdmFsaWRDbHMsaHRtbDpzZWxlY3RlZEl0ZW1IdG1sfSkuZGF0YShcImpzb25cIix2YWx1ZSk7aWYoY2ZnLmRpc2FibGVkPT09ZmFsc2Upe2RlbEl0ZW1FbD0kKFwiPHNwYW4vPlwiLHtcImNsYXNzXCI6XCJtcy1jbG9zZS1idG5cIn0pLmRhdGEoXCJqc29uXCIsdmFsdWUpLmFwcGVuZFRvKHNlbGVjdGVkSXRlbUVsKTtkZWxJdGVtRWwuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25UYWdUcmlnZ2VyQ2xpY2sscmVmKSl9fWl0ZW1zLnB1c2goc2VsZWN0ZWRJdGVtRWwpfSk7bXMuc2VsZWN0aW9uQ29udGFpbmVyLnByZXBlbmQoaXRlbXMpO21zLl92YWx1ZUNvbnRhaW5lcj0kKFwiPGRpdi8+XCIse3N0eWxlOlwiZGlzcGxheTogbm9uZTtcIn0pOyQuZWFjaChtcy5nZXRWYWx1ZSgpLGZ1bmN0aW9uKGksdmFsKXt2YXIgZWw9JChcIjxpbnB1dC8+XCIse3R5cGU6XCJoaWRkZW5cIixuYW1lOmNmZy5uYW1lLHZhbHVlOnZhbH0pO2VsLmFwcGVuZFRvKG1zLl92YWx1ZUNvbnRhaW5lcil9KTttcy5fdmFsdWVDb250YWluZXIuYXBwZW5kVG8obXMuc2VsZWN0aW9uQ29udGFpbmVyKTtpZihjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJiFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXttcy5pbnB1dC53aWR0aCgwKTtpbnB1dE9mZnNldD1tcy5pbnB1dC5vZmZzZXQoKS5sZWZ0LW1zLnNlbGVjdGlvbkNvbnRhaW5lci5vZmZzZXQoKS5sZWZ0O3c9bXMuY29udGFpbmVyLndpZHRoKCktaW5wdXRPZmZzZXQtNDI7bXMuaW5wdXQud2lkdGgodyl9aWYoX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcyxfc2VsZWN0aW9uLmxlbmd0aCkpfWVsc2V7bXMuaGVscGVyLmhpZGUoKX19LF9zZWxlY3RJdGVtOmZ1bmN0aW9uKGl0ZW0pe2lmKGNmZy5tYXhTZWxlY3Rpb249PT0xKXtfc2VsZWN0aW9uPVtdfW1zLmFkZFRvU2VsZWN0aW9uKGl0ZW0uZGF0YShcImpzb25cIikpO2l0ZW0ucmVtb3ZlQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7aWYoY2ZnLmV4cGFuZE9uRm9jdXM9PT1mYWxzZXx8X3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXttcy5jb2xsYXBzZSgpfWlmKCFfaGFzRm9jdXMpe21zLmlucHV0LmZvY3VzKCl9ZWxzZSBpZihfaGFzRm9jdXMmJihjZmcuZXhwYW5kT25Gb2N1c3x8X2N0cmxEb3duKSl7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7aWYoX2N0cmxEb3duKXttcy5leHBhbmQoKX19fSxfc29ydEFuZFRyaW06ZnVuY3Rpb24oZGF0YSl7dmFyIHE9bXMuZ2V0UmF3VmFsdWUoKSxmaWx0ZXJlZD1bXSxuZXdTdWdnZXN0aW9ucz1bXSxzZWxlY3RlZFZhbHVlcz1tcy5nZXRWYWx1ZSgpO2lmKHEubGVuZ3RoPjApeyQuZWFjaChkYXRhLGZ1bmN0aW9uKGluZGV4LG9iail7dmFyIG5hbWU9b2JqW2NmZy5kaXNwbGF5RmllbGRdO2lmKGNmZy5tYXRjaENhc2U9PT10cnVlJiZuYW1lLmluZGV4T2YocSk+LTF8fGNmZy5tYXRjaENhc2U9PT1mYWxzZSYmbmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocS50b0xvd2VyQ2FzZSgpKT4tMSl7aWYoY2ZnLnN0cmljdFN1Z2dlc3Q9PT1mYWxzZXx8bmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocS50b0xvd2VyQ2FzZSgpKT09PTApe2ZpbHRlcmVkLnB1c2gob2JqKX19fSl9ZWxzZXtmaWx0ZXJlZD1kYXRhfSQuZWFjaChmaWx0ZXJlZCxmdW5jdGlvbihpbmRleCxvYmope2lmKGNmZy5hbGxvd0R1cGxpY2F0ZXN8fCQuaW5BcnJheShvYmpbY2ZnLnZhbHVlRmllbGRdLHNlbGVjdGVkVmFsdWVzKT09PS0xKXtuZXdTdWdnZXN0aW9ucy5wdXNoKG9iail9fSk7aWYoY2ZnLnNvcnRPcmRlciE9PW51bGwpe25ld1N1Z2dlc3Rpb25zLnNvcnQoZnVuY3Rpb24oYSxiKXtpZihhW2NmZy5zb3J0T3JkZXJdPGJbY2ZnLnNvcnRPcmRlcl0pe3JldHVybiBjZmcuc29ydERpcj09PVwiYXNjXCI/LTE6MX1pZihhW2NmZy5zb3J0T3JkZXJdPmJbY2ZnLnNvcnRPcmRlcl0pe3JldHVybiBjZmcuc29ydERpcj09PVwiYXNjXCI/MTotMX1yZXR1cm4gMH0pfWlmKGNmZy5tYXhTdWdnZXN0aW9ucyYmY2ZnLm1heFN1Z2dlc3Rpb25zPjApe25ld1N1Z2dlc3Rpb25zPW5ld1N1Z2dlc3Rpb25zLnNsaWNlKDAsY2ZnLm1heFN1Z2dlc3Rpb25zKX1yZXR1cm4gbmV3U3VnZ2VzdGlvbnN9LF9ncm91cDpmdW5jdGlvbihkYXRhKXtpZihjZmcuZ3JvdXBCeSE9PW51bGwpe19ncm91cHM9e307JC5lYWNoKGRhdGEsZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBwcm9wcz1jZmcuZ3JvdXBCeS5pbmRleE9mKFwiLlwiKT4tMT9jZmcuZ3JvdXBCeS5zcGxpdChcIi5cIik6Y2ZnLmdyb3VwQnk7dmFyIHByb3A9dmFsdWVbY2ZnLmdyb3VwQnldO2lmKHR5cGVvZiBwcm9wcyE9XCJzdHJpbmdcIil7cHJvcD12YWx1ZTt3aGlsZShwcm9wcy5sZW5ndGg+MCl7cHJvcD1wcm9wW3Byb3BzLnNoaWZ0KCldfX1pZihfZ3JvdXBzW3Byb3BdPT09dW5kZWZpbmVkKXtfZ3JvdXBzW3Byb3BdPXt0aXRsZTpwcm9wLGl0ZW1zOlt2YWx1ZV19fWVsc2V7X2dyb3Vwc1twcm9wXS5pdGVtcy5wdXNoKHZhbHVlKX19KX1yZXR1cm4gZGF0YX0sX3VwZGF0ZUhlbHBlcjpmdW5jdGlvbihodG1sKXttcy5oZWxwZXIuaHRtbChodG1sKTtpZighbXMuaGVscGVyLmlzKFwiOnZpc2libGVcIikpe21zLmhlbHBlci5mYWRlSW4oKX19LF92YWxpZGF0ZVNpbmdsZUl0ZW06ZnVuY3Rpb24odmFsdWUpe2lmKGNmZy52cmVnZXghPT1udWxsJiZjZmcudnJlZ2V4IGluc3RhbmNlb2YgUmVnRXhwKXtyZXR1cm4gY2ZnLnZyZWdleC50ZXN0KHZhbHVlKX1lbHNlIGlmKGNmZy52dHlwZSE9PW51bGwpe3N3aXRjaChjZmcudnR5cGUpe2Nhc2VcImFscGhhXCI6cmV0dXJuL15bYS16QS1aX10rJC8udGVzdCh2YWx1ZSk7Y2FzZVwiYWxwaGFudW1cIjpyZXR1cm4vXlthLXpBLVowLTlfXSskLy50ZXN0KHZhbHVlKTtjYXNlXCJlbWFpbFwiOnJldHVybi9eKFxcdyspKFtcXC0rLl1bXFx3XSspKkAoXFx3W1xcLVxcd10qXFwuKXsxLDV9KFtBLVphLXpdKXsyLDZ9JC8udGVzdCh2YWx1ZSk7Y2FzZVwidXJsXCI6cmV0dXJuLygoKF5odHRwcz8pfCheZnRwKSk6XFwvXFwvKFtcXC1cXHddK1xcLikrXFx3ezIsM30oXFwvWyVcXC1cXHddKyhcXC5cXHd7Mix9KT8pKigoW1xcd1xcLVxcLlxcP1xcXFxcXC8rQCYjO2B+PSUhXSopKFxcLlxcd3syLH0pPykqXFwvPykvaS50ZXN0KHZhbHVlKTtjYXNlXCJpcGFkZHJlc3NcIjpyZXR1cm4vXlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9JC8udGVzdCh2YWx1ZSl9fXJldHVybiB0cnVlfX07dmFyIGhhbmRsZXJzPXtfb25CbHVyOmZ1bmN0aW9uKCl7bXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKFwibXMtY3RuLWZvY3VzXCIpO21zLmNvbGxhcHNlKCk7X2hhc0ZvY3VzPWZhbHNlO2lmKG1zLmdldFJhd1ZhbHVlKCkhPT1cIlwiJiZjZmcuYWxsb3dGcmVlRW50cmllcz09PXRydWUpe3ZhciBvYmo9e307b2JqW2NmZy5kaXNwbGF5RmllbGRdPW9ialtjZmcudmFsdWVGaWVsZF09bXMuZ2V0UmF3VmFsdWUoKS50cmltKCk7bXMuYWRkVG9TZWxlY3Rpb24ob2JqKX1zZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtpZihtcy5pc1ZhbGlkKCk9PT1mYWxzZSl7bXMuY29udGFpbmVyLmFkZENsYXNzKGNmZy5pbnZhbGlkQ2xzKX1lbHNlIGlmKG1zLmlucHV0LnZhbCgpIT09XCJcIiYmY2ZnLmFsbG93RnJlZUVudHJpZXM9PT1mYWxzZSl7bXMuZW1wdHkoKTtzZWxmLl91cGRhdGVIZWxwZXIoXCJcIil9JChtcykudHJpZ2dlcihcImJsdXJcIixbbXNdKX0sX29uQ29tYm9JdGVtTW91c2VPdmVyOmZ1bmN0aW9uKGUpe3ZhciB0YXJnZXQ9JChlLmN1cnJlbnRUYXJnZXQpO2lmKCF0YXJnZXQuaGFzQ2xhc3MoXCJtcy1yZXMtaXRlbS1kaXNhYmxlZFwiKSl7bXMuY29tYm9ib3guY2hpbGRyZW4oKS5yZW1vdmVDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTt0YXJnZXQuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIil9fSxfb25Db21ib0l0ZW1TZWxlY3RlZDpmdW5jdGlvbihlKXt2YXIgdGFyZ2V0PSQoZS5jdXJyZW50VGFyZ2V0KTtpZighdGFyZ2V0Lmhhc0NsYXNzKFwibXMtcmVzLWl0ZW0tZGlzYWJsZWRcIikpe3NlbGYuX3NlbGVjdEl0ZW0oJChlLmN1cnJlbnRUYXJnZXQpKX19LF9vbkZvY3VzOmZ1bmN0aW9uKCl7bXMuaW5wdXQuZm9jdXMoKX0sX29uSW5wdXRDbGljazpmdW5jdGlvbigpe2lmKG1zLmlzRGlzYWJsZWQoKT09PWZhbHNlJiZfaGFzRm9jdXMpe2lmKGNmZy50b2dnbGVPbkNsaWNrPT09dHJ1ZSl7aWYoY2ZnLmV4cGFuZGVkKXttcy5jb2xsYXBzZSgpfWVsc2V7bXMuZXhwYW5kKCl9fX19LF9vbklucHV0Rm9jdXM6ZnVuY3Rpb24oKXtpZihtcy5pc0Rpc2FibGVkKCk9PT1mYWxzZSYmIV9oYXNGb2N1cyl7X2hhc0ZvY3VzPXRydWU7bXMuY29udGFpbmVyLmFkZENsYXNzKFwibXMtY3RuLWZvY3VzXCIpO21zLmNvbnRhaW5lci5yZW1vdmVDbGFzcyhjZmcuaW52YWxpZENscyk7dmFyIGN1ckxlbmd0aD1tcy5nZXRSYXdWYWx1ZSgpLmxlbmd0aDtpZihjZmcuZXhwYW5kT25Gb2N1cz09PXRydWUpe21zLmV4cGFuZCgpfWlmKF9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbil7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsX3NlbGVjdGlvbi5sZW5ndGgpKX1lbHNlIGlmKGN1ckxlbmd0aDxjZmcubWluQ2hhcnMpe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsY2ZnLm1pbkNoYXJzLWN1ckxlbmd0aCkpfXNlbGYuX3JlbmRlclNlbGVjdGlvbigpOyQobXMpLnRyaWdnZXIoXCJmb2N1c1wiLFttc10pfX0sX29uS2V5RG93bjpmdW5jdGlvbihlKXt2YXIgYWN0aXZlPW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpLGZyZWVJbnB1dD1tcy5pbnB1dC52YWwoKTskKG1zKS50cmlnZ2VyKFwia2V5ZG93blwiLFttcyxlXSk7aWYoZS5rZXlDb2RlPT09S0VZQ09ERVMuVEFCJiYoY2ZnLnVzZVRhYktleT09PWZhbHNlfHxjZmcudXNlVGFiS2V5PT09dHJ1ZSYmYWN0aXZlLmxlbmd0aD09PTAmJm1zLmlucHV0LnZhbCgpLmxlbmd0aD09PTApKXtoYW5kbGVycy5fb25CbHVyKCk7cmV0dXJufXN3aXRjaChlLmtleUNvZGUpe2Nhc2UgS0VZQ09ERVMuQkFDS1NQQUNFOmlmKGZyZWVJbnB1dC5sZW5ndGg9PT0wJiZtcy5nZXRTZWxlY3Rpb24oKS5sZW5ndGg+MCYmY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiKXtfc2VsZWN0aW9uLnBvcCgpO3NlbGYuX3JlbmRlclNlbGVjdGlvbigpOyQobXMpLnRyaWdnZXIoXCJzZWxlY3Rpb25jaGFuZ2VcIixbbXMsbXMuZ2V0U2VsZWN0aW9uKCldKTttcy5pbnB1dC5hdHRyKFwicGxhY2Vob2xkZXJcIixjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJm1zLmdldFZhbHVlKCkubGVuZ3RoPjA/XCJcIjpjZmcucGxhY2Vob2xkZXIpO21zLmlucHV0LmZvY3VzKCk7ZS5wcmV2ZW50RGVmYXVsdCgpfWJyZWFrO2Nhc2UgS0VZQ09ERVMuVEFCOmNhc2UgS0VZQ09ERVMuRVNDOmUucHJldmVudERlZmF1bHQoKTticmVhaztjYXNlIEtFWUNPREVTLkVOVEVSOmlmKGZyZWVJbnB1dCE9PVwiXCJ8fGNmZy5leHBhbmRlZCl7ZS5wcmV2ZW50RGVmYXVsdCgpfWJyZWFrO2Nhc2UgS0VZQ09ERVMuQ09NTUE6aWYoY2ZnLnVzZUNvbW1hS2V5PT09dHJ1ZSl7ZS5wcmV2ZW50RGVmYXVsdCgpfWJyZWFrO2Nhc2UgS0VZQ09ERVMuQ1RSTDpfY3RybERvd249dHJ1ZTticmVhaztjYXNlIEtFWUNPREVTLkRPV05BUlJPVzplLnByZXZlbnREZWZhdWx0KCk7c2VsZi5fbW92ZVNlbGVjdGVkUm93KFwiZG93blwiKTticmVhaztjYXNlIEtFWUNPREVTLlVQQVJST1c6ZS5wcmV2ZW50RGVmYXVsdCgpO3NlbGYuX21vdmVTZWxlY3RlZFJvdyhcInVwXCIpO2JyZWFrO2RlZmF1bHQ6aWYoX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWt9fSxfb25LZXlVcDpmdW5jdGlvbihlKXt2YXIgZnJlZUlucHV0PW1zLmdldFJhd1ZhbHVlKCksaW5wdXRWYWxpZD0kLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aD4wJiYoIWNmZy5tYXhFbnRyeUxlbmd0aHx8JC50cmltKG1zLmlucHV0LnZhbCgpKS5sZW5ndGg8PWNmZy5tYXhFbnRyeUxlbmd0aCksc2VsZWN0ZWQsb2JqPXt9OyQobXMpLnRyaWdnZXIoXCJrZXl1cFwiLFttcyxlXSk7Y2xlYXJUaW1lb3V0KF90aW1lcik7aWYoZS5rZXlDb2RlPT09S0VZQ09ERVMuRVNDJiZjZmcuZXhwYW5kZWQpe21zLmNvbWJvYm94LmhpZGUoKX1pZihlLmtleUNvZGU9PT1LRVlDT0RFUy5UQUImJmNmZy51c2VUYWJLZXk9PT1mYWxzZXx8ZS5rZXlDb2RlPktFWUNPREVTLkVOVEVSJiZlLmtleUNvZGU8S0VZQ09ERVMuU1BBQ0Upe2lmKGUua2V5Q29kZT09PUtFWUNPREVTLkNUUkwpe19jdHJsRG93bj1mYWxzZX1yZXR1cm59c3dpdGNoKGUua2V5Q29kZSl7Y2FzZSBLRVlDT0RFUy5VUEFSUk9XOmNhc2UgS0VZQ09ERVMuRE9XTkFSUk9XOmUucHJldmVudERlZmF1bHQoKTticmVhaztjYXNlIEtFWUNPREVTLkVOVEVSOmNhc2UgS0VZQ09ERVMuVEFCOmNhc2UgS0VZQ09ERVMuQ09NTUE6aWYoZS5rZXlDb2RlIT09S0VZQ09ERVMuQ09NTUF8fGNmZy51c2VDb21tYUtleT09PXRydWUpe2UucHJldmVudERlZmF1bHQoKTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXtzZWxlY3RlZD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdFwiKTtpZihzZWxlY3RlZC5sZW5ndGg+MCl7c2VsZi5fc2VsZWN0SXRlbShzZWxlY3RlZCk7cmV0dXJufX1pZihpbnB1dFZhbGlkPT09dHJ1ZSYmY2ZnLmFsbG93RnJlZUVudHJpZXM9PT10cnVlKXtvYmpbY2ZnLmRpc3BsYXlGaWVsZF09b2JqW2NmZy52YWx1ZUZpZWxkXT1mcmVlSW5wdXQudHJpbSgpO21zLmFkZFRvU2VsZWN0aW9uKG9iaik7bXMuY29sbGFwc2UoKTttcy5pbnB1dC5mb2N1cygpfWJyZWFrfWRlZmF1bHQ6aWYoX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcyxfc2VsZWN0aW9uLmxlbmd0aCkpfWVsc2V7aWYoZnJlZUlucHV0Lmxlbmd0aDxjZmcubWluQ2hhcnMpe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsY2ZnLm1pbkNoYXJzLWZyZWVJbnB1dC5sZW5ndGgpKTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXttcy5jb2xsYXBzZSgpfX1lbHNlIGlmKGNmZy5tYXhFbnRyeUxlbmd0aCYmZnJlZUlucHV0Lmxlbmd0aD5jZmcubWF4RW50cnlMZW5ndGgpe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4RW50cnlSZW5kZXJlci5jYWxsKHRoaXMsZnJlZUlucHV0Lmxlbmd0aC1jZmcubWF4RW50cnlMZW5ndGgpKTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXttcy5jb2xsYXBzZSgpfX1lbHNle21zLmhlbHBlci5oaWRlKCk7aWYoY2ZnLm1pbkNoYXJzPD1mcmVlSW5wdXQubGVuZ3RoKXtfdGltZXI9c2V0VGltZW91dChmdW5jdGlvbigpe2lmKGNmZy5leHBhbmRlZD09PXRydWUpe3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfWVsc2V7bXMuZXhwYW5kKCl9fSxjZmcudHlwZURlbGF5KX19fWJyZWFrfX0sX29uVGFnVHJpZ2dlckNsaWNrOmZ1bmN0aW9uKGUpe21zLnJlbW92ZUZyb21TZWxlY3Rpb24oJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoXCJqc29uXCIpKX0sX29uVHJpZ2dlckNsaWNrOmZ1bmN0aW9uKCl7aWYobXMuaXNEaXNhYmxlZCgpPT09ZmFsc2UmJiEoY2ZnLmV4cGFuZE9uRm9jdXM9PT10cnVlJiZfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pKXskKG1zKS50cmlnZ2VyKFwidHJpZ2dlcmNsaWNrXCIsW21zXSk7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7bXMuY29sbGFwc2UoKX1lbHNle3ZhciBjdXJMZW5ndGg9bXMuZ2V0UmF3VmFsdWUoKS5sZW5ndGg7aWYoY3VyTGVuZ3RoPj1jZmcubWluQ2hhcnMpe21zLmlucHV0LmZvY3VzKCk7bXMuZXhwYW5kKCl9ZWxzZXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLGNmZy5taW5DaGFycy1jdXJMZW5ndGgpKX19fX0sX29uV2luZG93UmVzaXplZDpmdW5jdGlvbigpe3NlbGYuX3JlbmRlclNlbGVjdGlvbigpfX07aWYoZWxlbWVudCE9PW51bGwpe3NlbGYuX3JlbmRlcihlbGVtZW50KX19OyQuZm4ubWFnaWNTdWdnZXN0PWZ1bmN0aW9uKG9wdGlvbnMpe3ZhciBvYmo9JCh0aGlzKTtpZihvYmouc2l6ZSgpPT09MSYmb2JqLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIikpe3JldHVybiBvYmouZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKX1vYmouZWFjaChmdW5jdGlvbihpKXt2YXIgY250cj0kKHRoaXMpO2lmKGNudHIuZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKSl7cmV0dXJufWlmKHRoaXMubm9kZU5hbWUudG9Mb3dlckNhc2UoKT09PVwic2VsZWN0XCIpe29wdGlvbnMuZGF0YT1bXTtvcHRpb25zLnZhbHVlPVtdOyQuZWFjaCh0aGlzLmNoaWxkcmVuLGZ1bmN0aW9uKGluZGV4LGNoaWxkKXtpZihjaGlsZC5ub2RlTmFtZSYmY2hpbGQubm9kZU5hbWUudG9Mb3dlckNhc2UoKT09PVwib3B0aW9uXCIpe29wdGlvbnMuZGF0YS5wdXNoKHtpZDpjaGlsZC52YWx1ZSxuYW1lOmNoaWxkLnRleHR9KTtpZigkKGNoaWxkKS5hdHRyKFwic2VsZWN0ZWRcIikpe29wdGlvbnMudmFsdWUucHVzaChjaGlsZC52YWx1ZSl9fX0pfXZhciBkZWY9e307JC5lYWNoKHRoaXMuYXR0cmlidXRlcyxmdW5jdGlvbihpLGF0dCl7ZGVmW2F0dC5uYW1lXT1hdHQubmFtZT09PVwidmFsdWVcIiYmYXR0LnZhbHVlIT09XCJcIj9KU09OLnBhcnNlKGF0dC52YWx1ZSk6YXR0LnZhbHVlfSk7dmFyIGZpZWxkPW5ldyBNYWdpY1N1Z2dlc3QodGhpcywkLmV4dGVuZChbXSwkLmZuLm1hZ2ljU3VnZ2VzdC5kZWZhdWx0cyxvcHRpb25zLGRlZikpO2NudHIuZGF0YShcIm1hZ2ljU3VnZ2VzdFwiLGZpZWxkKTtmaWVsZC5jb250YWluZXIuZGF0YShcIm1hZ2ljU3VnZ2VzdFwiLGZpZWxkKX0pO2lmKG9iai5zaXplKCk9PT0xKXtyZXR1cm4gb2JqLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIil9cmV0dXJuIG9ian07JC5mbi5tYWdpY1N1Z2dlc3QuZGVmYXVsdHM9e319KShqUXVlcnkpOyIsIi8qKlxyXG4gKiBNdWx0aXBsZSBTZWxlY3Rpb24gQ29tcG9uZW50IGZvciBCb290c3RyYXBcclxuICogQ2hlY2sgbmljb2xhc2JpemUuZ2l0aHViLmlvL21hZ2ljc3VnZ2VzdC8gZm9yIGxhdGVzdCB1cGRhdGVzLlxyXG4gKlxyXG4gKiBBdXRob3I6ICAgICAgIE5pY29sYXMgQml6ZVxyXG4gKiBDcmVhdGVkOiAgICAgIEZlYiA4dGggMjAxM1xyXG4gKiBMYXN0IFVwZGF0ZWQ6IE9jdCAxNnRoIDIwMTRcclxuICogVmVyc2lvbjogICAgICAyLjEuNFxyXG4gKiBMaWNlbmNlOiAgICAgIE1hZ2ljU3VnZ2VzdCBpcyBsaWNlbmNlZCB1bmRlciBNSVQgbGljZW5jZSAoaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVClcclxuICovXHJcbihmdW5jdGlvbigkKVxyXG57XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIHZhciBNYWdpY1N1Z2dlc3QgPSBmdW5jdGlvbihlbGVtZW50LCBvcHRpb25zKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBtcyA9IHRoaXM7XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEluaXRpYWxpemVzIHRoZSBNYWdpY1N1Z2dlc3QgY29tcG9uZW50XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xyXG4gICAgICAgICAgICAvKioqKioqKioqKiAgQ09ORklHVVJBVElPTiBQUk9QRVJUSUVTICoqKioqKioqKioqKi9cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFJlc3RyaWN0cyBvciBhbGxvd3MgdGhlIHVzZXIgdG8gdmFsaWRhdGUgdHlwZWQgZW50cmllcy5cclxuICAgICAgICAgICAgICogRGVmYXVsdHMgdG8gdHJ1ZS5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGFsbG93RnJlZUVudHJpZXM6IHRydWUsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogUmVzdHJpY3RzIG9yIGFsbG93cyB0aGUgdXNlciB0byBhZGQgdGhlIHNhbWUgZW50cnkgbW9yZSB0aGFuIG9uY2VcclxuICAgICAgICAgICAgICogRGVmYXVsdHMgdG8gZmFsc2UuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBhbGxvd0R1cGxpY2F0ZXM6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEFkZGl0aW9uYWwgY29uZmlnIG9iamVjdCBwYXNzZWQgdG8gZWFjaCAkLmFqYXggY2FsbFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgYWpheENvbmZpZzoge30sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogSWYgYSBzaW5nbGUgc3VnZ2VzdGlvbiBjb21lcyBvdXQsIGl0IGlzIHByZXNlbGVjdGVkLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgYXV0b1NlbGVjdDogdHJ1ZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBdXRvIHNlbGVjdCB0aGUgZmlyc3QgbWF0Y2hpbmcgaXRlbSB3aXRoIG11bHRpcGxlIGl0ZW1zIHNob3duXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBzZWxlY3RGaXJzdDogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQWxsb3cgY3VzdG9taXphdGlvbiBvZiBxdWVyeSBwYXJhbWV0ZXJcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHF1ZXJ5UGFyYW06ICdxdWVyeScsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0cmlnZ2VyZWQganVzdCBiZWZvcmUgdGhlIGFqYXggcmVxdWVzdCBpcyBzZW50LCBzaW1pbGFyIHRvIGpRdWVyeVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgYmVmb3JlU2VuZDogZnVuY3Rpb24oKXsgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBIGN1c3RvbSBDU1MgY2xhc3MgdG8gYXBwbHkgdG8gdGhlIGZpZWxkJ3MgdW5kZXJseWluZyBlbGVtZW50LlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgY2xzOiAnJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBKU09OIERhdGEgc291cmNlIHVzZWQgdG8gcG9wdWxhdGUgdGhlIGNvbWJvIGJveC4gMyBvcHRpb25zIGFyZSBhdmFpbGFibGUgaGVyZTpcclxuICAgICAgICAgICAgICogTm8gRGF0YSBTb3VyY2UgKGRlZmF1bHQpXHJcbiAgICAgICAgICAgICAqICAgIFdoZW4gbGVmdCBudWxsLCB0aGUgY29tYm8gYm94IHdpbGwgbm90IHN1Z2dlc3QgYW55dGhpbmcuIEl0IGNhbiBzdGlsbCBlbmFibGUgdGhlIHVzZXIgdG8gZW50ZXJcclxuICAgICAgICAgICAgICogICAgbXVsdGlwbGUgZW50cmllcyBpZiBhbGxvd0ZyZWVFbnRyaWVzIGlzICogc2V0IHRvIHRydWUgKGRlZmF1bHQpLlxyXG4gICAgICAgICAgICAgKiBTdGF0aWMgU291cmNlXHJcbiAgICAgICAgICAgICAqICAgIFlvdSBjYW4gcGFzcyBhbiBhcnJheSBvZiBKU09OIG9iamVjdHMsIGFuIGFycmF5IG9mIHN0cmluZ3Mgb3IgZXZlbiBhIHNpbmdsZSBDU1Ygc3RyaW5nIGFzIHRoZVxyXG4gICAgICAgICAgICAgKiAgICBkYXRhIHNvdXJjZS5Gb3IgZXguIGRhdGE6IFsqIHtpZDowLG5hbWU6XCJQYXJpc1wifSwge2lkOiAxLCBuYW1lOiBcIk5ldyBZb3JrXCJ9XVxyXG4gICAgICAgICAgICAgKiAgICBZb3UgY2FuIGFsc28gcGFzcyBhbnkganNvbiBvYmplY3Qgd2l0aCB0aGUgcmVzdWx0cyBwcm9wZXJ0eSBjb250YWluaW5nIHRoZSBqc29uIGFycmF5LlxyXG4gICAgICAgICAgICAgKiBVcmxcclxuICAgICAgICAgICAgICogICAgIFlvdSBjYW4gcGFzcyB0aGUgdXJsIGZyb20gd2hpY2ggdGhlIGNvbXBvbmVudCB3aWxsIGZldGNoIGl0cyBKU09OIGRhdGEuRGF0YSB3aWxsIGJlIGZldGNoZWRcclxuICAgICAgICAgICAgICogICAgIHVzaW5nIGEgUE9TVCBhamF4IHJlcXVlc3QgdGhhdCB3aWxsICogaW5jbHVkZSB0aGUgZW50ZXJlZCB0ZXh0IGFzICdxdWVyeScgcGFyYW1ldGVyLiBUaGUgcmVzdWx0c1xyXG4gICAgICAgICAgICAgKiAgICAgZmV0Y2hlZCBmcm9tIHRoZSBzZXJ2ZXIgY2FuIGJlOlxyXG4gICAgICAgICAgICAgKiAgICAgLSBhbiBhcnJheSBvZiBKU09OIG9iamVjdHMgKGV4OiBbe2lkOi4uLixuYW1lOi4uLn0sey4uLn1dKVxyXG4gICAgICAgICAgICAgKiAgICAgLSBhIHN0cmluZyBjb250YWluaW5nIGFuIGFycmF5IG9mIEpTT04gb2JqZWN0cyByZWFkeSB0byBiZSBwYXJzZWQgKGV4OiBcIlt7aWQ6Li4uLG5hbWU6Li4ufSx7Li4ufV1cIilcclxuICAgICAgICAgICAgICogICAgIC0gYSBKU09OIG9iamVjdCB3aG9zZSBkYXRhIHdpbGwgYmUgY29udGFpbmVkIGluIHRoZSByZXN1bHRzIHByb3BlcnR5XHJcbiAgICAgICAgICAgICAqICAgICAgKGV4OiB7cmVzdWx0czogW3tpZDouLi4sbmFtZTouLi59LHsuLi59XVxyXG4gICAgICAgICAgICAgKiBGdW5jdGlvblxyXG4gICAgICAgICAgICAgKiAgICAgWW91IGNhbiBwYXNzIGEgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhbiBhcnJheSBvZiBKU09OIG9iamVjdHMgIChleDogW3tpZDouLi4sbmFtZTouLi59LHsuLi59XSlcclxuICAgICAgICAgICAgICogICAgIFRoZSBmdW5jdGlvbiBjYW4gcmV0dXJuIHRoZSBKU09OIGRhdGEgb3IgaXQgY2FuIHVzZSB0aGUgZmlyc3QgYXJndW1lbnQgYXMgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSBkYXRhLlxyXG4gICAgICAgICAgICAgKiAgICAgT25seSBvbmUgKGNhbGxiYWNrIGZ1bmN0aW9uIG9yIHJldHVybiB2YWx1ZSkgaXMgbmVlZGVkIGZvciB0aGUgZnVuY3Rpb24gdG8gc3VjY2VlZC5cclxuICAgICAgICAgICAgICogICAgIFNlZSB0aGUgZm9sbG93aW5nIGV4YW1wbGU6XHJcbiAgICAgICAgICAgICAqICAgICBmdW5jdGlvbiAocmVzcG9uc2UpIHsgdmFyIG15anNvbiA9IFt7bmFtZTogJ3Rlc3QnLCBpZDogMX1dOyByZXNwb25zZShteWpzb24pOyByZXR1cm4gbXlqc29uOyB9XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBkYXRhOiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEFkZGl0aW9uYWwgcGFyYW1ldGVycyB0byB0aGUgYWpheCBjYWxsXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBkYXRhVXJsUGFyYW1zOiB7fSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBTdGFydCB0aGUgY29tcG9uZW50IGluIGEgZGlzYWJsZWQgc3RhdGUuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBkaXNhYmxlZDogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogTmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSB0aGF0IGRlZmluZXMgdGhlIGRpc2FibGVkIGJlaGF2aW91clxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZGlzYWJsZWRGaWVsZDogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBOYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IGRpc3BsYXllZCBpbiB0aGUgY29tYm8gbGlzdFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZGlzcGxheUZpZWxkOiAnbmFtZScsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogU2V0IHRvIGZhbHNlIGlmIHlvdSBvbmx5IHdhbnQgbW91c2UgaW50ZXJhY3Rpb24uIEluIHRoYXQgY2FzZSB0aGUgY29tYm8gd2lsbFxyXG4gICAgICAgICAgICAgKiBhdXRvbWF0aWNhbGx5IGV4cGFuZCBvbiBmb2N1cy5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGVkaXRhYmxlOiB0cnVlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFNldCBzdGFydGluZyBzdGF0ZSBmb3IgY29tYm8uXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBleHBhbmRlZDogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQXV0b21hdGljYWxseSBleHBhbmRzIGNvbWJvIG9uIGZvY3VzLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZXhwYW5kT25Gb2N1czogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogSlNPTiBwcm9wZXJ0eSBieSB3aGljaCB0aGUgbGlzdCBzaG91bGQgYmUgZ3JvdXBlZFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZ3JvdXBCeTogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byBoaWRlIHRoZSB0cmlnZ2VyIG9uIHRoZSByaWdodFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgaGlkZVRyaWdnZXI6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIGhpZ2hsaWdodCBzZWFyY2ggaW5wdXQgd2l0aGluIGRpc3BsYXllZCBzdWdnZXN0aW9uc1xyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgaGlnaGxpZ2h0OiB0cnVlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEEgY3VzdG9tIElEIGZvciB0aGlzIGNvbXBvbmVudFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgaWQ6IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQSBjbGFzcyB0aGF0IGlzIGFkZGVkIHRvIHRoZSBpbmZvIG1lc3NhZ2UgYXBwZWFyaW5nIG9uIHRoZSB0b3AtcmlnaHQgcGFydCBvZiB0aGUgY29tcG9uZW50XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBpbmZvTXNnQ2xzOiAnJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgcGFzc2VkIG91dCB0byB0aGUgSU5QVVQgdGFnLiBFbmFibGVzIHVzYWdlIG9mIEFuZ3VsYXJKUydzIGN1c3RvbSB0YWdzIGZvciBleC5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGlucHV0Q2ZnOiB7fSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgY2xhc3MgdGhhdCBpcyBhcHBsaWVkIHRvIHNob3cgdGhhdCB0aGUgZmllbGQgaXMgaW52YWxpZFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgaW52YWxpZENsczogJ21zLWludicsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gZmlsdGVyIGRhdGEgcmVzdWx0cyBhY2NvcmRpbmcgdG8gY2FzZS4gVXNlbGVzcyBpZiB0aGUgZGF0YSBpcyBmZXRjaGVkIHJlbW90ZWx5XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBtYXRjaENhc2U6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIE9uY2UgZXhwYW5kZWQsIHRoZSBjb21ibydzIGhlaWdodCB3aWxsIHRha2UgYXMgbXVjaCByb29tIGFzIHRoZSAjIG9mIGF2YWlsYWJsZSByZXN1bHRzLlxyXG4gICAgICAgICAgICAgKiAgICBJbiBjYXNlIHRoZXJlIGFyZSB0b28gbWFueSByZXN1bHRzIGRpc3BsYXllZCwgdGhpcyB3aWxsIGZpeCB0aGUgZHJvcCBkb3duIGhlaWdodC5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIG1heERyb3BIZWlnaHQ6IDI5MCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBEZWZpbmVzIGhvdyBsb25nIHRoZSB1c2VyIGZyZWUgZW50cnkgY2FuIGJlLiBTZXQgdG8gbnVsbCBmb3Igbm8gbGltaXQuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBtYXhFbnRyeUxlbmd0aDogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyB0aGUgaGVscGVyIHRleHQgd2hlbiB0aGUgbWF4IGVudHJ5IGxlbmd0aCBoYXMgYmVlbiBzdXJwYXNzZWQuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBtYXhFbnRyeVJlbmRlcmVyOiBmdW5jdGlvbih2KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1BsZWFzZSByZWR1Y2UgeW91ciBlbnRyeSBieSAnICsgdiArICcgY2hhcmFjdGVyJyArICh2ID4gMSA/ICdzJzonJyk7XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIG1heGltdW0gbnVtYmVyIG9mIHJlc3VsdHMgZGlzcGxheWVkIGluIHRoZSBjb21ibyBkcm9wIGRvd24gYXQgb25jZS5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIG1heFN1Z2dlc3Rpb25zOiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBtYXhpbXVtIG51bWJlciBvZiBpdGVtcyB0aGUgdXNlciBjYW4gc2VsZWN0IGlmIG11bHRpcGxlIHNlbGVjdGlvbiBpcyBhbGxvd2VkLlxyXG4gICAgICAgICAgICAgKiAgICBTZXQgdG8gbnVsbCB0byByZW1vdmUgdGhlIGxpbWl0LlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgbWF4U2VsZWN0aW9uOiAxMCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyB0aGUgaGVscGVyIHRleHQgd2hlbiB0aGUgbWF4IHNlbGVjdGlvbiBhbW91bnQgaGFzIGJlZW4gcmVhY2hlZC4gVGhlIGZ1bmN0aW9uIGhhcyBhIHNpbmdsZVxyXG4gICAgICAgICAgICAgKiAgICBwYXJhbWV0ZXIgd2hpY2ggaXMgdGhlIG51bWJlciBvZiBzZWxlY3RlZCBlbGVtZW50cy5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIG1heFNlbGVjdGlvblJlbmRlcmVyOiBmdW5jdGlvbih2KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1lvdSBjYW5ub3QgY2hvb3NlIG1vcmUgdGhhbiAnICsgdiArICcgaXRlbScgKyAodiA+IDEgPyAncyc6JycpO1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBtZXRob2QgdXNlZCBieSB0aGUgYWpheCByZXF1ZXN0LlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIG1pbmltdW0gbnVtYmVyIG9mIGNoYXJhY3RlcnMgdGhlIHVzZXIgbXVzdCB0eXBlIGJlZm9yZSB0aGUgY29tYm8gZXhwYW5kcyBhbmQgb2ZmZXJzIHN1Z2dlc3Rpb25zLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgbWluQ2hhcnM6IDAsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0aGF0IGRlZmluZXMgdGhlIGhlbHBlciB0ZXh0IHdoZW4gbm90IGVub3VnaCBsZXR0ZXJzIGFyZSBzZXQuIFRoZSBmdW5jdGlvbiBoYXMgYSBzaW5nbGVcclxuICAgICAgICAgICAgICogICAgcGFyYW1ldGVyIHdoaWNoIGlzIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gdGhlIHJlcXVpcmVkIGFtb3VudCBvZiBsZXR0ZXJzIGFuZCB0aGUgY3VycmVudCBvbmUuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBtaW5DaGFyc1JlbmRlcmVyOiBmdW5jdGlvbih2KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1BsZWFzZSB0eXBlICcgKyB2ICsgJyBtb3JlIGNoYXJhY3RlcicgKyAodiA+IDEgPyAncyc6JycpO1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFdoZXRoZXIgb3Igbm90IHNvcnRpbmcgLyBmaWx0ZXJpbmcgc2hvdWxkIGJlIGRvbmUgcmVtb3RlbHkgb3IgbG9jYWxseS5cclxuICAgICAgICAgICAgICogVXNlIGVpdGhlciAnbG9jYWwnIG9yICdyZW1vdGUnXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBtb2RlOiAnbG9jYWwnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBuYW1lIHVzZWQgYXMgYSBmb3JtIGVsZW1lbnQuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBuYW1lOiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSB0ZXh0IGRpc3BsYXllZCB3aGVuIHRoZXJlIGFyZSBubyBzdWdnZXN0aW9ucy5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIG5vU3VnZ2VzdGlvblRleHQ6ICdObyBzdWdnZXN0aW9ucycsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIGRlZmF1bHQgcGxhY2Vob2xkZXIgdGV4dCB3aGVuIG5vdGhpbmcgaGFzIGJlZW4gZW50ZXJlZFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICdUeXBlIG9yIGNsaWNrIGhlcmUnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdXNlZCB0byBkZWZpbmUgaG93IHRoZSBpdGVtcyB3aWxsIGJlIHByZXNlbnRlZCBpbiB0aGUgY29tYm9cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHJlbmRlcmVyOiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFdoZXRoZXIgb3Igbm90IHRoaXMgZmllbGQgc2hvdWxkIGJlIHJlcXVpcmVkXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gcmVuZGVyIHNlbGVjdGlvbiBhcyBhIGRlbGltaXRlZCBzdHJpbmdcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHJlc3VsdEFzU3RyaW5nOiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUZXh0IGRlbGltaXRlciB0byB1c2UgaW4gYSBkZWxpbWl0ZWQgc3RyaW5nLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgcmVzdWx0QXNTdHJpbmdEZWxpbWl0ZXI6ICcsJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBOYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IHRoYXQgcmVwcmVzZW50cyB0aGUgbGlzdCBvZiBzdWdnZXN0ZWQgb2JqZWN0c1xyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgcmVzdWx0c0ZpZWxkOiAncmVzdWx0cycsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQSBjdXN0b20gQ1NTIGNsYXNzIHRvIGFkZCB0byBhIHNlbGVjdGVkIGl0ZW1cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHNlbGVjdGlvbkNsczogJycsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQW4gb3B0aW9uYWwgZWxlbWVudCByZXBsYWNlbWVudCBpbiB3aGljaCB0aGUgc2VsZWN0aW9uIGlzIHJlbmRlcmVkXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBzZWxlY3Rpb25Db250YWluZXI6IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogV2hlcmUgdGhlIHNlbGVjdGVkIGl0ZW1zIHdpbGwgYmUgZGlzcGxheWVkLiBPbmx5ICdyaWdodCcsICdib3R0b20nIGFuZCAnaW5uZXInIGFyZSB2YWxpZCB2YWx1ZXNcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHNlbGVjdGlvblBvc2l0aW9uOiAnaW5uZXInLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdXNlZCB0byBkZWZpbmUgaG93IHRoZSBpdGVtcyB3aWxsIGJlIHByZXNlbnRlZCBpbiB0aGUgdGFnIGxpc3RcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHNlbGVjdGlvblJlbmRlcmVyOiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIHN0YWNrIHRoZSBzZWxlY3Rpb25lZCBpdGVtcyB3aGVuIHBvc2l0aW9uZWQgb24gdGhlIGJvdHRvbVxyXG4gICAgICAgICAgICAgKiAgICBSZXF1aXJlcyB0aGUgc2VsZWN0aW9uUG9zaXRpb24gdG8gYmUgc2V0IHRvICdib3R0b20nXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBzZWxlY3Rpb25TdGFja2VkOiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBEaXJlY3Rpb24gdXNlZCBmb3Igc29ydGluZy4gT25seSAnYXNjJyBhbmQgJ2Rlc2MnIGFyZSB2YWxpZCB2YWx1ZXNcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHNvcnREaXI6ICdhc2MnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIG5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgZm9yIGxvY2FsIHJlc3VsdCBzb3J0aW5nLlxyXG4gICAgICAgICAgICAgKiAgICBMZWF2ZSBudWxsIGlmIHlvdSBkbyBub3Qgd2lzaCB0aGUgcmVzdWx0cyB0byBiZSBvcmRlcmVkIG9yIGlmIHRoZXkgYXJlIGFscmVhZHkgb3JkZXJlZCByZW1vdGVseS5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHNvcnRPcmRlcjogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBJZiBzZXQgdG8gdHJ1ZSwgc3VnZ2VzdGlvbnMgd2lsbCBoYXZlIHRvIHN0YXJ0IGJ5IHVzZXIgaW5wdXQgKGFuZCBub3Qgc2ltcGx5IGNvbnRhaW4gaXQgYXMgYSBzdWJzdHJpbmcpXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBzdHJpY3RTdWdnZXN0OiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBDdXN0b20gc3R5bGUgYWRkZWQgdG8gdGhlIGNvbXBvbmVudCBjb250YWluZXIuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBzdHlsZTogJycsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHRoZSBjb21ibyB3aWxsIGV4cGFuZCAvIGNvbGxhcHNlIHdoZW4gY2xpY2tlZCB1cG9uXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICB0b2dnbGVPbkNsaWNrOiBmYWxzZSxcclxuXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQW1vdW50IChpbiBtcykgYmV0d2VlbiBrZXlib2FyZCByZWdpc3RlcnMuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICB0eXBlRGVsYXk6IDQwMCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBJZiBzZXQgdG8gdHJ1ZSwgdGFiIHdvbid0IGJsdXIgdGhlIGNvbXBvbmVudCBidXQgd2lsbCBiZSByZWdpc3RlcmVkIGFzIHRoZSBFTlRFUiBrZXlcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHVzZVRhYktleTogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHVzaW5nIGNvbW1hIHdpbGwgdmFsaWRhdGUgdGhlIHVzZXIncyBjaG9pY2VcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHVzZUNvbW1hS2V5OiB0cnVlLFxyXG5cclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgb3Igbm90IHRoZSByZXN1bHRzIHdpbGwgYmUgZGlzcGxheWVkIHdpdGggYSB6ZWJyYSB0YWJsZSBzdHlsZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgdXNlWmVicmFTdHlsZTogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogaW5pdGlhbCB2YWx1ZSBmb3IgdGhlIGZpZWxkXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICB2YWx1ZTogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBuYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IHRoYXQgcmVwcmVzZW50cyBpdHMgdW5kZXJseWluZyB2YWx1ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgdmFsdWVGaWVsZDogJ2lkJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiByZWd1bGFyIGV4cHJlc3Npb24gdG8gdmFsaWRhdGUgdGhlIHZhbHVlcyBhZ2FpbnN0XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICB2cmVnZXg6IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogdHlwZSB0byB2YWxpZGF0ZSBhZ2FpbnN0XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICB2dHlwZTogbnVsbFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBjb25mID0gJC5leHRlbmQoe30sb3B0aW9ucyk7XHJcbiAgICAgICAgdmFyIGNmZyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgY29uZik7XHJcblxyXG4gICAgICAgIC8qKioqKioqKioqICBQVUJMSUMgTUVUSE9EUyAqKioqKioqKioqKiovXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQWRkIG9uZSBvciBtdWx0aXBsZSBqc29uIGl0ZW1zIHRvIHRoZSBjdXJyZW50IHNlbGVjdGlvblxyXG4gICAgICAgICAqIEBwYXJhbSBpdGVtcyAtIGpzb24gb2JqZWN0IG9yIGFycmF5IG9mIGpzb24gb2JqZWN0c1xyXG4gICAgICAgICAqIEBwYXJhbSBpc1NpbGVudCAtIChvcHRpb25hbCkgc2V0IHRvIHRydWUgdG8gc3VwcHJlc3MgJ3NlbGVjdGlvbmNoYW5nZScgZXZlbnQgZnJvbSBiZWluZyB0cmlnZ2VyZWRcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmFkZFRvU2VsZWN0aW9uID0gZnVuY3Rpb24oaXRlbXMsIGlzU2lsZW50KVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKCFjZmcubWF4U2VsZWN0aW9uIHx8IF9zZWxlY3Rpb24ubGVuZ3RoIDwgY2ZnLm1heFNlbGVjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgaWYgKCEkLmlzQXJyYXkoaXRlbXMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbXMgPSBbaXRlbXNdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlY2hhbmdlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgJC5lYWNoKGl0ZW1zLCBmdW5jdGlvbihpbmRleCwganNvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZmcuYWxsb3dEdXBsaWNhdGVzIHx8ICQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSwgbXMuZ2V0VmFsdWUoKSkgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9zZWxlY3Rpb24ucHVzaChqc29uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVjaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmKHZhbHVlY2hhbmdlZCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1wdHkoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNTaWxlbnQgIT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdzZWxlY3Rpb25jaGFuZ2UnLCBbdGhpcywgdGhpcy5nZXRTZWxlY3Rpb24oKV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmlucHV0LmF0dHIoJ3BsYWNlaG9sZGVyJywgKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiB0aGlzLmdldFZhbHVlKCkubGVuZ3RoID4gMCkgPyAnJyA6IGNmZy5wbGFjZWhvbGRlcik7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ2xlYXJzIHRoZSBjdXJyZW50IHNlbGVjdGlvblxyXG4gICAgICAgICAqIEBwYXJhbSBpc1NpbGVudCAtIChvcHRpb25hbCkgc2V0IHRvIHRydWUgdG8gc3VwcHJlc3MgJ3NlbGVjdGlvbmNoYW5nZScgZXZlbnQgZnJvbSBiZWluZyB0cmlnZ2VyZWRcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmNsZWFyID0gZnVuY3Rpb24oaXNTaWxlbnQpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLnJlbW92ZUZyb21TZWxlY3Rpb24oX3NlbGVjdGlvbi5zbGljZSgwKSwgaXNTaWxlbnQpOyAvLyBjbG9uZSBhcnJheSB0byBhdm9pZCBjb25jdXJyZW5jeSBpc3N1ZXNcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDb2xsYXBzZSB0aGUgZHJvcCBkb3duIHBhcnQgb2YgdGhlIGNvbWJvXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5jb2xsYXBzZSA9IGZ1bmN0aW9uKClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGlmIChjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29tYm9ib3guZGV0YWNoKCk7XHJcbiAgICAgICAgICAgICAgICBjZmcuZXhwYW5kZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICQodGhpcykudHJpZ2dlcignY29sbGFwc2UnLCBbdGhpc10pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2V0IHRoZSBjb21wb25lbnQgaW4gYSBkaXNhYmxlZCBzdGF0ZS5cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmRpc2FibGUgPSBmdW5jdGlvbigpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5hZGRDbGFzcygnbXMtY3RuLWRpc2FibGVkJyk7XHJcbiAgICAgICAgICAgIGNmZy5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIG1zLmlucHV0LmF0dHIoJ2Rpc2FibGVkJywgdHJ1ZSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRW1wdGllcyBvdXQgdGhlIGNvbWJvIHVzZXIgdGV4dFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZW1wdHkgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0LnZhbCgnJyk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2V0IHRoZSBjb21wb25lbnQgaW4gYSBlbmFibGUgc3RhdGUuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5lbmFibGUgPSBmdW5jdGlvbigpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5yZW1vdmVDbGFzcygnbXMtY3RuLWRpc2FibGVkJyk7XHJcbiAgICAgICAgICAgIGNmZy5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBtcy5pbnB1dC5hdHRyKCdkaXNhYmxlZCcsIGZhbHNlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBFeHBhbmQgdGhlIGRyb3AgZHJvd24gcGFydCBvZiB0aGUgY29tYm8uXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5leHBhbmQgPSBmdW5jdGlvbigpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAoIWNmZy5leHBhbmRlZCAmJiAodGhpcy5pbnB1dC52YWwoKS5sZW5ndGggPj0gY2ZnLm1pbkNoYXJzIHx8IHRoaXMuY29tYm9ib3guY2hpbGRyZW4oKS5zaXplKCkgPiAwKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb21ib2JveC5hcHBlbmRUbyh0aGlzLmNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcclxuICAgICAgICAgICAgICAgIGNmZy5leHBhbmRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ2V4cGFuZCcsIFt0aGlzXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXRyaWV2ZSBjb21wb25lbnQgZW5hYmxlZCBzdGF0dXNcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmlzRGlzYWJsZWQgPSBmdW5jdGlvbigpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZXR1cm4gY2ZnLmRpc2FibGVkO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENoZWNrcyB3aGV0aGVyIHRoZSBmaWVsZCBpcyB2YWxpZCBvciBub3RcclxuICAgICAgICAgKiBAcmV0dXJuIHtib29sZWFufVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuaXNWYWxpZCA9IGZ1bmN0aW9uKClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciB2YWxpZCA9IGNmZy5yZXF1aXJlZCA9PT0gZmFsc2UgfHwgX3NlbGVjdGlvbi5sZW5ndGggPiAwO1xyXG4gICAgICAgICAgICBpZihjZmcudnR5cGUgfHwgY2ZnLnZyZWdleCl7XHJcbiAgICAgICAgICAgICAgICAkLmVhY2goX3NlbGVjdGlvbiwgZnVuY3Rpb24oaW5kZXgsIGl0ZW0pe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkID0gdmFsaWQgJiYgc2VsZi5fdmFsaWRhdGVTaW5nbGVJdGVtKGl0ZW1bY2ZnLnZhbHVlRmllbGRdKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB2YWxpZDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBHZXRzIHRoZSBkYXRhIHBhcmFtcyBmb3IgY3VycmVudCBhamF4IHJlcXVlc3RcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmdldERhdGFVcmxQYXJhbXMgPSBmdW5jdGlvbigpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZXR1cm4gY2ZnLmRhdGFVcmxQYXJhbXM7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogR2V0cyB0aGUgbmFtZSBnaXZlbiB0byB0aGUgZm9ybSBpbnB1dFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZ2V0TmFtZSA9IGZ1bmN0aW9uKClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJldHVybiBjZmcubmFtZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXRyaWV2ZSBhbiBhcnJheSBvZiBzZWxlY3RlZCBqc29uIG9iamVjdHNcclxuICAgICAgICAgKiBAcmV0dXJuIHtBcnJheX1cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmdldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJldHVybiBfc2VsZWN0aW9uO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHJpZXZlIHRoZSBjdXJyZW50IHRleHQgZW50ZXJlZCBieSB0aGUgdXNlclxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZ2V0UmF3VmFsdWUgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICByZXR1cm4gbXMuaW5wdXQudmFsKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0cmlldmUgYW4gYXJyYXkgb2Ygc2VsZWN0ZWQgdmFsdWVzXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5nZXRWYWx1ZSA9IGZ1bmN0aW9uKClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJldHVybiAkLm1hcChfc2VsZWN0aW9uLCBmdW5jdGlvbihvKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb1tjZmcudmFsdWVGaWVsZF07XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJlbW92ZSBvbmUgb3IgbXVsdGlwbGVzIGpzb24gaXRlbXMgZnJvbSB0aGUgY3VycmVudCBzZWxlY3Rpb25cclxuICAgICAgICAgKiBAcGFyYW0gaXRlbXMgLSBqc29uIG9iamVjdCBvciBhcnJheSBvZiBqc29uIG9iamVjdHNcclxuICAgICAgICAgKiBAcGFyYW0gaXNTaWxlbnQgLSAob3B0aW9uYWwpIHNldCB0byB0cnVlIHRvIHN1cHByZXNzICdzZWxlY3Rpb25jaGFuZ2UnIGV2ZW50IGZyb20gYmVpbmcgdHJpZ2dlcmVkXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5yZW1vdmVGcm9tU2VsZWN0aW9uID0gZnVuY3Rpb24oaXRlbXMsIGlzU2lsZW50KVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKCEkLmlzQXJyYXkoaXRlbXMpKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtcyA9IFtpdGVtc107XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHZhbHVlY2hhbmdlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAkLmVhY2goaXRlbXMsIGZ1bmN0aW9uKGluZGV4LCBqc29uKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaSA9ICQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSwgbXMuZ2V0VmFsdWUoKSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA+IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX3NlbGVjdGlvbi5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVjaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZWNoYW5nZWQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgaWYoaXNTaWxlbnQgIT09IHRydWUpe1xyXG4gICAgICAgICAgICAgICAgICAgICQodGhpcykudHJpZ2dlcignc2VsZWN0aW9uY2hhbmdlJywgW3RoaXMsIHRoaXMuZ2V0U2VsZWN0aW9uKCldKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRPbkZvY3VzKXtcclxuICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXQuYXR0cigncGxhY2Vob2xkZXInLCAoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmIHRoaXMuZ2V0VmFsdWUoKS5sZW5ndGggPiAwKSA/ICcnIDogY2ZnLnBsYWNlaG9sZGVyKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBHZXQgY3VycmVudCBkYXRhXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5nZXREYXRhID0gZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgcmV0dXJuIF9jYkRhdGE7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2V0IHVwIHNvbWUgY29tYm8gZGF0YSBhZnRlciBpdCBoYXMgYmVlbiByZW5kZXJlZFxyXG4gICAgICAgICAqIEBwYXJhbSBkYXRhXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSl7XHJcbiAgICAgICAgICAgIGNmZy5kYXRhID0gZGF0YTtcclxuICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2V0cyB0aGUgbmFtZSBmb3IgdGhlIGlucHV0IGZpZWxkIHNvIGl0IGNhbiBiZSBmZXRjaGVkIGluIHRoZSBmb3JtXHJcbiAgICAgICAgICogQHBhcmFtIG5hbWVcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLnNldE5hbWUgPSBmdW5jdGlvbihuYW1lKXtcclxuICAgICAgICAgICAgY2ZnLm5hbWUgPSBuYW1lO1xyXG4gICAgICAgICAgICBpZihuYW1lKXtcclxuICAgICAgICAgICAgICAgIGNmZy5uYW1lICs9IG5hbWUuaW5kZXhPZignW10nKSA+IDAgPyAnJyA6ICdbXSc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYobXMuX3ZhbHVlQ29udGFpbmVyKXtcclxuICAgICAgICAgICAgICAgICQuZWFjaChtcy5fdmFsdWVDb250YWluZXIuY2hpbGRyZW4oKSwgZnVuY3Rpb24oaSwgZWwpe1xyXG4gICAgICAgICAgICAgICAgICAgIGVsLm5hbWUgPSBjZmcubmFtZTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2V0cyB0aGUgY3VycmVudCBzZWxlY3Rpb24gd2l0aCB0aGUgSlNPTiBpdGVtcyBwcm92aWRlZFxyXG4gICAgICAgICAqIEBwYXJhbSBpdGVtc1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuc2V0U2VsZWN0aW9uID0gZnVuY3Rpb24oaXRlbXMpe1xyXG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldHMgYSB2YWx1ZSBmb3IgdGhlIGNvbWJvIGJveC4gVmFsdWUgbXVzdCBiZSBhbiBhcnJheSBvZiB2YWx1ZXMgd2l0aCBkYXRhIHR5cGUgbWF0Y2hpbmcgdmFsdWVGaWVsZCBvbmUuXHJcbiAgICAgICAgICogQHBhcmFtIGRhdGFcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLnNldFZhbHVlID0gZnVuY3Rpb24odmFsdWVzKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIGl0ZW1zID0gW107XHJcblxyXG4gICAgICAgICAgICAkLmVhY2godmFsdWVzLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIC8vIGZpcnN0IHRyeSB0byBzZWUgaWYgd2UgaGF2ZSB0aGUgZnVsbCBvYmplY3RzIGZyb20gb3VyIGRhdGEgc2V0XHJcbiAgICAgICAgICAgICAgICB2YXIgZm91bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICQuZWFjaChfY2JEYXRhLCBmdW5jdGlvbihpLGl0ZW0pe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGl0ZW1bY2ZnLnZhbHVlRmllbGRdID09IHZhbHVlKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZighZm91bmQpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZih2YWx1ZSkgPT09ICdvYmplY3QnKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGpzb24gPSB7fTtcclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbltjZmcudmFsdWVGaWVsZF0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbltjZmcuZGlzcGxheUZpZWxkXSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKGpzb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGlmKGl0ZW1zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2V0cyBkYXRhIHBhcmFtcyBmb3Igc3Vic2VxdWVudCBhamF4IHJlcXVlc3RzXHJcbiAgICAgICAgICogQHBhcmFtIHBhcmFtc1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuc2V0RGF0YVVybFBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNmZy5kYXRhVXJsUGFyYW1zID0gJC5leHRlbmQoe30scGFyYW1zKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKioqKioqKioqKiAgUFJJVkFURSAqKioqKioqKioqKiovXHJcbiAgICAgICAgdmFyIF9zZWxlY3Rpb24gPSBbXSwgICAgICAvLyBzZWxlY3RlZCBvYmplY3RzXHJcbiAgICAgICAgICAgIF9jb21ib0l0ZW1IZWlnaHQgPSAwLCAvLyBoZWlnaHQgZm9yIGVhY2ggY29tYm8gaXRlbS5cclxuICAgICAgICAgICAgX3RpbWVyLFxyXG4gICAgICAgICAgICBfaGFzRm9jdXMgPSBmYWxzZSxcclxuICAgICAgICAgICAgX2dyb3VwcyA9IG51bGwsXHJcbiAgICAgICAgICAgIF9jYkRhdGEgPSBbXSxcclxuICAgICAgICAgICAgX2N0cmxEb3duID0gZmFsc2UsXHJcbiAgICAgICAgICAgIEtFWUNPREVTID0ge1xyXG4gICAgICAgICAgICAgICAgQkFDS1NQQUNFOiA4LFxyXG4gICAgICAgICAgICAgICAgVEFCOiA5LFxyXG4gICAgICAgICAgICAgICAgRU5URVI6IDEzLFxyXG4gICAgICAgICAgICAgICAgQ1RSTDogMTcsXHJcbiAgICAgICAgICAgICAgICBFU0M6IDI3LFxyXG4gICAgICAgICAgICAgICAgU1BBQ0U6IDMyLFxyXG4gICAgICAgICAgICAgICAgVVBBUlJPVzogMzgsXHJcbiAgICAgICAgICAgICAgICBET1dOQVJST1c6IDQwLFxyXG4gICAgICAgICAgICAgICAgQ09NTUE6IDE4OFxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgc2VsZiA9IHtcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBFbXB0aWVzIHRoZSByZXN1bHQgY29udGFpbmVyIGFuZCByZWZpbGxzIGl0IHdpdGggdGhlIGFycmF5IG9mIGpzb24gcmVzdWx0cyBpbiBpbnB1dFxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX2Rpc3BsYXlTdWdnZXN0aW9uczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2hvdygpO1xyXG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3guZW1wdHkoKTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgcmVzSGVpZ2h0ID0gMCwgLy8gdG90YWwgaGVpZ2h0IHRha2VuIGJ5IGRpc3BsYXllZCByZXN1bHRzLlxyXG4gICAgICAgICAgICAgICAgICAgIG5iR3JvdXBzID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihfZ3JvdXBzID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyQ29tYm9JdGVtcyhkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNIZWlnaHQgPSBfY29tYm9JdGVtSGVpZ2h0ICogZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGdycE5hbWUgaW4gX2dyb3Vwcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYkdyb3VwcyArPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCc8ZGl2Lz4nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtcmVzLWdyb3VwJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IGdycE5hbWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuYXBwZW5kVG8obXMuY29tYm9ib3gpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJDb21ib0l0ZW1zKF9ncm91cHNbZ3JwTmFtZV0uaXRlbXMsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB2YXIgX2dyb3VwSXRlbUhlaWdodCA9IG1zLmNvbWJvYm94LmZpbmQoJy5tcy1yZXMtZ3JvdXAnKS5vdXRlckhlaWdodCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKF9ncm91cEl0ZW1IZWlnaHQgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHZhciB0bXBSZXNIZWlnaHQgPSBuYkdyb3VwcyAqIF9ncm91cEl0ZW1IZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXNIZWlnaHQgPSAoX2NvbWJvSXRlbUhlaWdodCAqIGRhdGEubGVuZ3RoKSArIHRtcFJlc0hlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzSGVpZ2h0ID0gX2NvbWJvSXRlbUhlaWdodCAqIChkYXRhLmxlbmd0aCArIG5iR3JvdXBzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYocmVzSGVpZ2h0IDwgbXMuY29tYm9ib3guaGVpZ2h0KCkgfHwgcmVzSGVpZ2h0IDw9IGNmZy5tYXhEcm9wSGVpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guaGVpZ2h0KHJlc0hlaWdodCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmKHJlc0hlaWdodCA+PSBtcy5jb21ib2JveC5oZWlnaHQoKSAmJiByZXNIZWlnaHQgPiBjZmcubWF4RHJvcEhlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhlaWdodChjZmcubWF4RHJvcEhlaWdodCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPT09IDEgJiYgY2ZnLmF1dG9TZWxlY3QgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5jaGlsZHJlbigpLmZpbHRlcignOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmxhc3QnKS5hZGRDbGFzcygnbXMtcmVzLWl0ZW0tYWN0aXZlJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGNmZy5zZWxlY3RGaXJzdCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmNoaWxkcmVuKCkuZmlsdGVyKCc6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3QnKS5hZGRDbGFzcygnbXMtcmVzLWl0ZW0tYWN0aXZlJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPT09IDAgJiYgbXMuZ2V0UmF3VmFsdWUoKSAhPT0gXCJcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBub1N1Z2dlc3Rpb25UZXh0ID0gY2ZnLm5vU3VnZ2VzdGlvblRleHQucmVwbGFjZSgvXFx7XFx7LipcXH1cXH0vLCBtcy5pbnB1dC52YWwoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKG5vU3VnZ2VzdGlvblRleHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gV2hlbiBmcmVlIGVudHJ5IGlzIG9mZiwgYWRkIGludmFsaWQgY2xhc3MgdG8gaW5wdXQgaWYgbm8gZGF0YSBtYXRjaGVzXHJcbiAgICAgICAgICAgICAgICBpZihjZmcuYWxsb3dGcmVlRW50cmllcyA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICQobXMuaW5wdXQpLmFkZENsYXNzKGNmZy5pbnZhbGlkQ2xzKTtcclxuICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhpZGUoKTtcclxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkKG1zLmlucHV0KS5yZW1vdmVDbGFzcyhjZmcuaW52YWxpZENscyk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIGpzb24gb2JqZWN0cyBmcm9tIGFuIGFycmF5IG9mIHN0cmluZ3MuXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfZ2V0RW50cmllc0Zyb21TdHJpbmdBcnJheTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGpzb24gPSBbXTtcclxuICAgICAgICAgICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbihpbmRleCwgcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBlbnRyeSA9IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgIGVudHJ5W2NmZy5kaXNwbGF5RmllbGRdID0gZW50cnlbY2ZnLnZhbHVlRmllbGRdID0gJC50cmltKHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGpzb24ucHVzaChlbnRyeSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBqc29uO1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFJlcGxhY2VzIGh0bWwgd2l0aCBoaWdobGlnaHRlZCBodG1sIGFjY29yZGluZyB0byBjYXNlXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSBodG1sXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfaGlnaGxpZ2h0U3VnZ2VzdGlvbjogZnVuY3Rpb24oaHRtbCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHEgPSBtcy5pbnB1dC52YWwoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL2VzY2FwZSBzcGVjaWFsIHJlZ2V4IGNoYXJhY3RlcnNcclxuICAgICAgICAgICAgICAgIHZhciBzcGVjaWFsQ2hhcmFjdGVycyA9IFsnXicsICckJywgJyonLCAnKycsICc/JywgJy4nLCAnKCcsICcpJywgJzonLCAnIScsICd8JywgJ3snLCAnfScsICdbJywgJ10nXTtcclxuXHJcbiAgICAgICAgICAgICAgICAkLmVhY2goc3BlY2lhbENoYXJhY3RlcnMsIGZ1bmN0aW9uIChpbmRleCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBxID0gcS5yZXBsYWNlKHZhbHVlLCBcIlxcXFxcIiArIHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICAgICAgaWYocS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaHRtbDsgLy8gbm90aGluZyBlbnRlcmVkIGFzIGlucHV0XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGdsb2IgPSBjZmcubWF0Y2hDYXNlID09PSB0cnVlID8gJ2cnIDogJ2dpJztcclxuICAgICAgICAgICAgICAgIHJldHVybiBodG1sLnJlcGxhY2UobmV3IFJlZ0V4cCgnKCcgKyBxICsgJykoPyEoW148XSspPz4pJywgZ2xvYiksICc8ZW0+JDE8L2VtPicpO1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIE1vdmVzIHRoZSBzZWxlY3RlZCBjdXJzb3IgYW1vbmdzdCB0aGUgbGlzdCBpdGVtXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSBkaXIgLSAndXAnIG9yICdkb3duJ1xyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX21vdmVTZWxlY3RlZFJvdzogZnVuY3Rpb24oZGlyKSB7XHJcbiAgICAgICAgICAgICAgICBpZighY2ZnLmV4cGFuZGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgbGlzdCwgc3RhcnQsIGFjdGl2ZSwgc2Nyb2xsUG9zO1xyXG4gICAgICAgICAgICAgICAgbGlzdCA9IG1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIik7XHJcbiAgICAgICAgICAgICAgICBpZihkaXIgPT09ICdkb3duJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGlzdC5lcSgwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGlzdC5maWx0ZXIoJzpsYXN0Jyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBhY3RpdmUgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0Jyk7XHJcbiAgICAgICAgICAgICAgICBpZihhY3RpdmUubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGRpciA9PT0gJ2Rvd24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gYWN0aXZlLm5leHRBbGwoJy5tcy1yZXMtaXRlbTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKScpLmZpcnN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXJ0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmVxKDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFBvcyA9IG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3AoMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXJ0WzBdLm9mZnNldFRvcCArIHN0YXJ0Lm91dGVySGVpZ2h0KCkgPiBtcy5jb21ib2JveC5oZWlnaHQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2Nyb2xsVG9wKHNjcm9sbFBvcyArIF9jb21ib0l0ZW1IZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGFjdGl2ZS5wcmV2QWxsKCcubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCknKS5maXJzdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzdGFydC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGlzdC5maWx0ZXIoJzpsYXN0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3AoX2NvbWJvSXRlbUhlaWdodCAqIGxpc3QubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzdGFydFswXS5vZmZzZXRUb3AgPCBtcy5jb21ib2JveC5zY3JvbGxUb3AoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2Nyb2xsVG9wKG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpIC0gX2NvbWJvSXRlbUhlaWdodCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsaXN0LnJlbW92ZUNsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpO1xyXG4gICAgICAgICAgICAgICAgc3RhcnQuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQWNjb3JkaW5nIHRvIGdpdmVuIGRhdGEgYW5kIHF1ZXJ5LCBzb3J0IGFuZCBhZGQgc3VnZ2VzdGlvbnMgaW4gdGhlaXIgY29udGFpbmVyXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfcHJvY2Vzc1N1Z2dlc3Rpb25zOiBmdW5jdGlvbihzb3VyY2UpIHtcclxuICAgICAgICAgICAgICAgIHZhciBqc29uID0gbnVsbCwgZGF0YSA9IHNvdXJjZSB8fCBjZmcuZGF0YTtcclxuICAgICAgICAgICAgICAgIGlmKGRhdGEgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YoZGF0YSkgPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhID0gZGF0YS5jYWxsKG1zLCBtcy5nZXRSYXdWYWx1ZSgpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKGRhdGEpID09PSAnc3RyaW5nJykgeyAvLyBnZXQgcmVzdWx0cyBmcm9tIGFqYXhcclxuICAgICAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignYmVmb3JlbG9hZCcsIFttc10pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVBhcmFtc1tjZmcucXVlcnlQYXJhbV0gPSBtcy5pbnB1dC52YWwoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9ICQuZXh0ZW5kKHF1ZXJ5UGFyYW1zLCBjZmcuZGF0YVVybFBhcmFtcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICQuYWpheCgkLmV4dGVuZCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBjZmcubWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBkYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlU2VuZDogY2ZnLmJlZm9yZVNlbmQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihhc3luY0RhdGEpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb24gPSB0eXBlb2YoYXN5bmNEYXRhKSA9PT0gJ3N0cmluZycgPyBKU09OLnBhcnNlKGFzeW5jRGF0YSkgOiBhc3luY0RhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKGpzb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2xvYWQnLCBbbXMsIGpzb25dKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihzZWxmLl9hc3luY1ZhbHVlcyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNldFZhbHVlKHR5cGVvZihzZWxmLl9hc3luY1ZhbHVlcykgPT09ICdzdHJpbmcnID8gSlNPTi5wYXJzZShzZWxmLl9hc3luY1ZhbHVlcykgOiBzZWxmLl9hc3luY1ZhbHVlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUoc2VsZi5fYXN5bmNWYWx1ZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyhcIkNvdWxkIG5vdCByZWFjaCBzZXJ2ZXJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIGNmZy5hamF4Q29uZmlnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgeyAvLyByZXN1bHRzIGZyb20gbG9jYWwgYXJyYXlcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPiAwICYmIHR5cGVvZihkYXRhWzBdKSA9PT0gJ3N0cmluZycpIHsgLy8gcmVzdWx0cyBmcm9tIGFycmF5IG9mIHN0cmluZ3NcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jYkRhdGEgPSBzZWxmLl9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5KGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgeyAvLyByZWd1bGFyIGpzb24gYXJyYXkgb3IganNvbiBvYmplY3Qgd2l0aCByZXN1bHRzIHByb3BlcnR5XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2JEYXRhID0gZGF0YVtjZmcucmVzdWx0c0ZpZWxkXSB8fCBkYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBzb3J0ZWREYXRhID0gY2ZnLm1vZGUgPT09ICdyZW1vdGUnID8gX2NiRGF0YSA6IHNlbGYuX3NvcnRBbmRUcmltKF9jYkRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2Rpc3BsYXlTdWdnZXN0aW9ucyhzZWxmLl9ncm91cChzb3J0ZWREYXRhKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFJlbmRlciB0aGUgY29tcG9uZW50IHRvIHRoZSBnaXZlbiBpbnB1dCBET00gZWxlbWVudFxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX3JlbmRlcjogZnVuY3Rpb24oZWwpIHtcclxuICAgICAgICAgICAgICAgIG1zLnNldE5hbWUoY2ZnLm5hbWUpOyAgLy8gbWFrZSBzdXJlIHRoZSBmb3JtIG5hbWUgaXMgY29ycmVjdFxyXG4gICAgICAgICAgICAgICAgLy8gaG9sZHMgdGhlIG1haW4gZGl2LCB3aWxsIHJlbGF5IHRoZSBmb2N1cyBldmVudHMgdG8gdGhlIGNvbnRhaW5lZCBpbnB1dCBlbGVtZW50LlxyXG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyID0gJCgnPGRpdi8+Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1jdG4gZm9ybS1jb250cm9sICcgKyAoY2ZnLnJlc3VsdEFzU3RyaW5nID8gJ21zLWFzLXN0cmluZyAnIDogJycpICsgY2ZnLmNscyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICgkKGVsKS5oYXNDbGFzcygnaW5wdXQtbGcnKSA/ICcgaW5wdXQtbGcnIDogJycpICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKCQoZWwpLmhhc0NsYXNzKCdpbnB1dC1zbScpID8gJyBpbnB1dC1zbScgOiAnJykgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2ZnLmRpc2FibGVkID09PSB0cnVlID8gJyBtcy1jdG4tZGlzYWJsZWQnIDogJycpICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGNmZy5lZGl0YWJsZSA9PT0gdHJ1ZSA/ICcnIDogJyBtcy1jdG4tcmVhZG9ubHknKSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChjZmcuaGlkZVRyaWdnZXIgPT09IGZhbHNlID8gJycgOiAnIG1zLW5vLXRyaWdnZXInKSxcclxuICAgICAgICAgICAgICAgICAgICBzdHlsZTogY2ZnLnN0eWxlLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkOiBjZmcuaWRcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmZvY3VzKCQucHJveHkoaGFuZGxlcnMuX29uRm9jdXMsIHRoaXMpKTtcclxuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5ibHVyKCQucHJveHkoaGFuZGxlcnMuX29uQmx1ciwgdGhpcykpO1xyXG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmtleWRvd24oJC5wcm94eShoYW5kbGVycy5fb25LZXlEb3duLCB0aGlzKSk7XHJcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIua2V5dXAoJC5wcm94eShoYW5kbGVycy5fb25LZXlVcCwgdGhpcykpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGhvbGRzIHRoZSBpbnB1dCBmaWVsZFxyXG4gICAgICAgICAgICAgICAgbXMuaW5wdXQgPSAkKCc8aW5wdXQvPicsICQuZXh0ZW5kKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogY2ZnLmVkaXRhYmxlID09PSB0cnVlID8gJycgOiAnIG1zLWlucHV0LXJlYWRvbmx5JyxcclxuICAgICAgICAgICAgICAgICAgICByZWFkb25seTogIWNmZy5lZGl0YWJsZSxcclxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogY2ZnLnBsYWNlaG9sZGVyLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBjZmcuZGlzYWJsZWRcclxuICAgICAgICAgICAgICAgIH0sIGNmZy5pbnB1dENmZykpO1xyXG5cclxuICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRGb2N1cywgdGhpcykpO1xyXG4gICAgICAgICAgICAgICAgbXMuaW5wdXQuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25JbnB1dENsaWNrLCB0aGlzKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gaG9sZHMgdGhlIHN1Z2dlc3Rpb25zLiB3aWxsIGFsd2F5cyBiZSBwbGFjZWQgb24gZm9jdXNcclxuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94ID0gJCgnPGRpdi8+Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1yZXMtY3RuIGRyb3Bkb3duLW1lbnUnXHJcbiAgICAgICAgICAgICAgICB9KS5oZWlnaHQoY2ZnLm1heERyb3BIZWlnaHQpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGJpbmQgdGhlIG9uY2xpY2sgYW5kIG1vdXNlb3ZlciB1c2luZyBkZWxlZ2F0ZWQgZXZlbnRzIChuZWVkcyBqUXVlcnkgPj0gMS43KVxyXG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3gub24oJ2NsaWNrJywgJ2Rpdi5tcy1yZXMtaXRlbScsICQucHJveHkoaGFuZGxlcnMuX29uQ29tYm9JdGVtU2VsZWN0ZWQsIHRoaXMpKTtcclxuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94Lm9uKCdtb3VzZW92ZXInLCAnZGl2Lm1zLXJlcy1pdGVtJywgJC5wcm94eShoYW5kbGVycy5fb25Db21ib0l0ZW1Nb3VzZU92ZXIsIHRoaXMpKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXtcclxuICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIgPSBjZmcuc2VsZWN0aW9uQ29udGFpbmVyO1xyXG4gICAgICAgICAgICAgICAgICAgICQobXMuc2VsZWN0aW9uQ29udGFpbmVyKS5hZGRDbGFzcygnbXMtc2VsLWN0bicpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIgPSAkKCc8ZGl2Lz4nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1zZWwtY3RuJ1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uRm9jdXMsIHRoaXMpKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgIWNmZy5zZWxlY3Rpb25Db250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuYXBwZW5kKG1zLmlucHV0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hcHBlbmQobXMuaW5wdXQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIG1zLmhlbHBlciA9ICQoJzxzcGFuLz4nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLWhlbHBlciAnICsgY2ZnLmluZm9Nc2dDbHNcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKCk7XHJcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYXBwZW5kKG1zLmhlbHBlcik7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFJlbmRlciB0aGUgd2hvbGUgdGhpbmdcclxuICAgICAgICAgICAgICAgICQoZWwpLnJlcGxhY2VXaXRoKG1zLmNvbnRhaW5lcik7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaChjZmcuc2VsZWN0aW9uUG9zaXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnYm90dG9tJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5pbnNlcnRBZnRlcihtcy5jb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLnNlbGVjdGlvblN0YWNrZWQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIud2lkdGgobXMuY29udGFpbmVyLndpZHRoKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5hZGRDbGFzcygnbXMtc3RhY2tlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JpZ2h0JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5pbnNlcnRBZnRlcihtcy5jb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmNzcygnZmxvYXQnLCAnbGVmdCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYXBwZW5kKG1zLnNlbGVjdGlvbkNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIC8vIGhvbGRzIHRoZSB0cmlnZ2VyIG9uIHRoZSByaWdodCBzaWRlXHJcbiAgICAgICAgICAgICAgICBpZihjZmcuaGlkZVRyaWdnZXIgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMudHJpZ2dlciA9ICQoJzxkaXYvPicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXRyaWdnZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sOiAnPGRpdiBjbGFzcz1cIm1zLXRyaWdnZXItaWNvXCI+PC9kaXY+J1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLnRyaWdnZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25UcmlnZ2VyQ2xpY2ssIHRoaXMpKTtcclxuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYXBwZW5kKG1zLnRyaWdnZXIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICQod2luZG93KS5yZXNpemUoJC5wcm94eShoYW5kbGVycy5fb25XaW5kb3dSZXNpemVkLCB0aGlzKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gZG8gbm90IHBlcmZvcm0gYW4gaW5pdGlhbCBjYWxsIGlmIHdlIGFyZSB1c2luZyBhamF4IHVubGVzcyB3ZSBoYXZlIGluaXRpYWwgdmFsdWVzXHJcbiAgICAgICAgICAgICAgICBpZihjZmcudmFsdWUgIT09IG51bGwgfHwgY2ZnLmRhdGEgIT09IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZihjZmcuZGF0YSkgPT09ICdzdHJpbmcnKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fYXN5bmNWYWx1ZXMgPSBjZmcudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcudmFsdWUgIT09IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuc2V0VmFsdWUoY2ZnLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAkKFwiYm9keVwiKS5jbGljayhmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYobXMuY29udGFpbmVyLmhhc0NsYXNzKCdtcy1jdG4tZm9jdXMnKSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuaGFzKGUudGFyZ2V0KS5sZW5ndGggPT09IDAgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS50YXJnZXQuY2xhc3NOYW1lLmluZGV4T2YoJ21zLXJlcy1pdGVtJykgPCAwICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUudGFyZ2V0LmNsYXNzTmFtZS5pbmRleE9mKCdtcy1jbG9zZS1idG4nKSA8IDAgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyWzBdICE9PSBlLnRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5fb25CbHVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2ZnLmV4cGFuZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogUmVuZGVycyBlYWNoIGVsZW1lbnQgd2l0aGluIHRoZSBjb21ibyBib3hcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9yZW5kZXJDb21ib0l0ZW1zOiBmdW5jdGlvbihpdGVtcywgaXNHcm91cGVkKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcmVmID0gdGhpcywgaHRtbCA9ICcnO1xyXG4gICAgICAgICAgICAgICAgJC5lYWNoKGl0ZW1zLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZGlzcGxheWVkID0gY2ZnLnJlbmRlcmVyICE9PSBudWxsID8gY2ZnLnJlbmRlcmVyLmNhbGwocmVmLCB2YWx1ZSkgOiB2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZGlzYWJsZWQgPSBjZmcuZGlzYWJsZWRGaWVsZCAhPT0gbnVsbCAmJiB2YWx1ZVtjZmcuZGlzYWJsZWRGaWVsZF0gPT09IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdEl0ZW1FbCA9ICQoJzxkaXYvPicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXJlcy1pdGVtICcgKyAoaXNHcm91cGVkID8gJ21zLXJlcy1pdGVtLWdyb3VwZWQgJzonJykgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGRpc2FibGVkID8gJ21zLXJlcy1pdGVtLWRpc2FibGVkICc6JycpICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChpbmRleCAlIDIgPT09IDEgJiYgY2ZnLnVzZVplYnJhU3R5bGUgPT09IHRydWUgPyAnbXMtcmVzLW9kZCcgOiAnJyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IGNmZy5oaWdobGlnaHQgPT09IHRydWUgPyBzZWxmLl9oaWdobGlnaHRTdWdnZXN0aW9uKGRpc3BsYXllZCkgOiBkaXNwbGF5ZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICdkYXRhLWpzb24nOiBKU09OLnN0cmluZ2lmeSh2YWx1ZSlcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICQoJzxkaXYvPicpLmFwcGVuZChyZXN1bHRJdGVtRWwpLmh0bWwoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3guYXBwZW5kKGh0bWwpO1xyXG4gICAgICAgICAgICAgICAgX2NvbWJvSXRlbUhlaWdodCA9IG1zLmNvbWJvYm94LmZpbmQoJy5tcy1yZXMtaXRlbTpmaXJzdCcpLm91dGVySGVpZ2h0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogUmVuZGVycyB0aGUgc2VsZWN0ZWQgaXRlbXMgaW50byB0aGVpciBjb250YWluZXIuXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfcmVuZGVyU2VsZWN0aW9uOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHZhciByZWYgPSB0aGlzLCB3ID0gMCwgaW5wdXRPZmZzZXQgPSAwLCBpdGVtcyA9IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIGFzVGV4dCA9IGNmZy5yZXN1bHRBc1N0cmluZyA9PT0gdHJ1ZSAmJiAhX2hhc0ZvY3VzO1xyXG5cclxuICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5maW5kKCcubXMtc2VsLWl0ZW0nKS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgIGlmKG1zLl92YWx1ZUNvbnRhaW5lciAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuX3ZhbHVlQ29udGFpbmVyLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICQuZWFjaChfc2VsZWN0aW9uLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpe1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtRWwsIGRlbEl0ZW1FbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtSHRtbCA9IGNmZy5zZWxlY3Rpb25SZW5kZXJlciAhPT0gbnVsbCA/IGNmZy5zZWxlY3Rpb25SZW5kZXJlci5jYWxsKHJlZiwgdmFsdWUpIDogdmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWxpZENscyA9IHNlbGYuX3ZhbGlkYXRlU2luZ2xlSXRlbSh2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXSkgPyAnJyA6ICcgbXMtc2VsLWludmFsaWQnO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyB0YWcgcmVwcmVzZW50aW5nIHNlbGVjdGVkIHZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYXNUZXh0ID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbUVsID0gJCgnPGRpdi8+Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXNlbC1pdGVtIG1zLXNlbC10ZXh0ICcgKyBjZmcuc2VsZWN0aW9uQ2xzICsgdmFsaWRDbHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBzZWxlY3RlZEl0ZW1IdG1sICsgKGluZGV4ID09PSAoX3NlbGVjdGlvbi5sZW5ndGggLSAxKSA/ICcnIDogY2ZnLnJlc3VsdEFzU3RyaW5nRGVsaW1pdGVyKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5kYXRhKCdqc29uJywgdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtRWwgPSAkKCc8ZGl2Lz4nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtc2VsLWl0ZW0gJyArIGNmZy5zZWxlY3Rpb25DbHMgKyB2YWxpZENscyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IHNlbGVjdGVkSXRlbUh0bWxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuZGF0YSgnanNvbicsIHZhbHVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5kaXNhYmxlZCA9PT0gZmFsc2Upe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc21hbGwgY3Jvc3MgaW1nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxJdGVtRWwgPSAkKCc8c3Bhbi8+Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1jbG9zZS1idG4nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5kYXRhKCdqc29uJywgdmFsdWUpLmFwcGVuZFRvKHNlbGVjdGVkSXRlbUVsKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxJdGVtRWwuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25UYWdUcmlnZ2VyQ2xpY2ssIHJlZikpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHNlbGVjdGVkSXRlbUVsKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLnByZXBlbmQoaXRlbXMpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHN0b3JlIHRoZSB2YWx1ZXMsIGJlaGF2aW91ciBvZiBtdWx0aXBsZSBzZWxlY3RcclxuICAgICAgICAgICAgICAgIG1zLl92YWx1ZUNvbnRhaW5lciA9ICQoJzxkaXYvPicsIHtcclxuICAgICAgICAgICAgICAgICAgICBzdHlsZTogJ2Rpc3BsYXk6IG5vbmU7J1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAkLmVhY2gobXMuZ2V0VmFsdWUoKSwgZnVuY3Rpb24oaSwgdmFsKXtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZWwgPSAkKCc8aW5wdXQvPicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2hpZGRlbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGNmZy5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWwuYXBwZW5kVG8obXMuX3ZhbHVlQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgbXMuX3ZhbHVlQ29udGFpbmVyLmFwcGVuZFRvKG1zLnNlbGVjdGlvbkNvbnRhaW5lcik7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmICFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQud2lkdGgoMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXRPZmZzZXQgPSBtcy5pbnB1dC5vZmZzZXQoKS5sZWZ0IC0gbXMuc2VsZWN0aW9uQ29udGFpbmVyLm9mZnNldCgpLmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdyA9IG1zLmNvbnRhaW5lci53aWR0aCgpIC0gaW5wdXRPZmZzZXQgLSA0MjtcclxuICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC53aWR0aCh3KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZihfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbil7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsIF9zZWxlY3Rpb24ubGVuZ3RoKSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmhlbHBlci5oaWRlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogU2VsZWN0IGFuIGl0ZW0gZWl0aGVyIHRocm91Z2gga2V5Ym9hcmQgb3IgbW91c2VcclxuICAgICAgICAgICAgICogQHBhcmFtIGl0ZW1cclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9zZWxlY3RJdGVtOiBmdW5jdGlvbihpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICBpZihjZmcubWF4U2VsZWN0aW9uID09PSAxKXtcclxuICAgICAgICAgICAgICAgICAgICBfc2VsZWN0aW9uID0gW107XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBtcy5hZGRUb1NlbGVjdGlvbihpdGVtLmRhdGEoJ2pzb24nKSk7XHJcbiAgICAgICAgICAgICAgICBpdGVtLnJlbW92ZUNsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcclxuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRPbkZvY3VzID09PSBmYWxzZSB8fCBfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbil7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmKCFfaGFzRm9jdXMpe1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYoX2hhc0ZvY3VzICYmIChjZmcuZXhwYW5kT25Gb2N1cyB8fCBfY3RybERvd24pKXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZihfY3RybERvd24pe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogU29ydHMgdGhlIHJlc3VsdHMgYW5kIGN1dCB0aGVtIGRvd24gdG8gbWF4ICMgb2YgZGlzcGxheWVkIHJlc3VsdHMgYXQgb25jZVxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX3NvcnRBbmRUcmltOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcSA9IG1zLmdldFJhd1ZhbHVlKCksXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQgPSBbXSxcclxuICAgICAgICAgICAgICAgICAgICBuZXdTdWdnZXN0aW9ucyA9IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkVmFsdWVzID0gbXMuZ2V0VmFsdWUoKTtcclxuICAgICAgICAgICAgICAgIC8vIGZpbHRlciB0aGUgZGF0YSBhY2NvcmRpbmcgdG8gZ2l2ZW4gaW5wdXRcclxuICAgICAgICAgICAgICAgIGlmKHEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbihpbmRleCwgb2JqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuYW1lID0gb2JqW2NmZy5kaXNwbGF5RmllbGRdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZigoY2ZnLm1hdGNoQ2FzZSA9PT0gdHJ1ZSAmJiBuYW1lLmluZGV4T2YocSkgPiAtMSkgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChjZmcubWF0Y2hDYXNlID09PSBmYWxzZSAmJiBuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpID4gLTEpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuc3RyaWN0U3VnZ2VzdCA9PT0gZmFsc2UgfHwgbmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocS50b0xvd2VyQ2FzZSgpKSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkLnB1c2gob2JqKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gdGFrZSBvdXQgdGhlIG9uZXMgdGhhdCBoYXZlIGFscmVhZHkgYmVlbiBzZWxlY3RlZFxyXG4gICAgICAgICAgICAgICAgJC5lYWNoKGZpbHRlcmVkLCBmdW5jdGlvbihpbmRleCwgb2JqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNmZy5hbGxvd0R1cGxpY2F0ZXMgfHwgJC5pbkFycmF5KG9ialtjZmcudmFsdWVGaWVsZF0sIHNlbGVjdGVkVmFsdWVzKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U3VnZ2VzdGlvbnMucHVzaChvYmopO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgLy8gc29ydCB0aGUgZGF0YVxyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnNvcnRPcmRlciAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zLnNvcnQoZnVuY3Rpb24oYSxiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGFbY2ZnLnNvcnRPcmRlcl0gPCBiW2NmZy5zb3J0T3JkZXJdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2ZnLnNvcnREaXIgPT09ICdhc2MnID8gLTEgOiAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGFbY2ZnLnNvcnRPcmRlcl0gPiBiW2NmZy5zb3J0T3JkZXJdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2ZnLnNvcnREaXIgPT09ICdhc2MnID8gMSA6IC0xO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gdHJpbSBpdCBkb3duXHJcbiAgICAgICAgICAgICAgICBpZihjZmcubWF4U3VnZ2VzdGlvbnMgJiYgY2ZnLm1heFN1Z2dlc3Rpb25zID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zID0gbmV3U3VnZ2VzdGlvbnMuc2xpY2UoMCwgY2ZnLm1heFN1Z2dlc3Rpb25zKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXdTdWdnZXN0aW9ucztcclxuXHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICBfZ3JvdXA6IGZ1bmN0aW9uKGRhdGEpe1xyXG4gICAgICAgICAgICAgICAgLy8gYnVpbGQgZ3JvdXBzXHJcbiAgICAgICAgICAgICAgICBpZihjZmcuZ3JvdXBCeSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9ncm91cHMgPSB7fTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcHMgPSBjZmcuZ3JvdXBCeS5pbmRleE9mKCcuJykgPiAtMSA/IGNmZy5ncm91cEJ5LnNwbGl0KCcuJykgOiBjZmcuZ3JvdXBCeTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByb3AgPSB2YWx1ZVtjZmcuZ3JvdXBCeV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZihwcm9wcykgIT0gJ3N0cmluZycpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcCA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUocHJvcHMubGVuZ3RoID4gMCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcCA9IHByb3BbcHJvcHMuc2hpZnQoKV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoX2dyb3Vwc1twcm9wXSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZ3JvdXBzW3Byb3BdID0ge3RpdGxlOiBwcm9wLCBpdGVtczogW3ZhbHVlXX07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZ3JvdXBzW3Byb3BdLml0ZW1zLnB1c2godmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBVcGRhdGUgdGhlIGhlbHBlciB0ZXh0XHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfdXBkYXRlSGVscGVyOiBmdW5jdGlvbihodG1sKSB7XHJcbiAgICAgICAgICAgICAgICBtcy5oZWxwZXIuaHRtbChodG1sKTtcclxuICAgICAgICAgICAgICAgIGlmKCFtcy5oZWxwZXIuaXMoXCI6dmlzaWJsZVwiKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmhlbHBlci5mYWRlSW4oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBWYWxpZGF0ZSBhbiBpdGVtIGFnYWluc3QgdnR5cGUgb3IgdnJlZ2V4XHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfdmFsaWRhdGVTaW5nbGVJdGVtOiBmdW5jdGlvbih2YWx1ZSl7XHJcbiAgICAgICAgICAgICAgICBpZihjZmcudnJlZ2V4ICE9PSBudWxsICYmIGNmZy52cmVnZXggaW5zdGFuY2VvZiBSZWdFeHApe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmcudnJlZ2V4LnRlc3QodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmKGNmZy52dHlwZSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaChjZmcudnR5cGUpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdhbHBoYSc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoL15bYS16QS1aX10rJC8pLnRlc3QodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdhbHBoYW51bSc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoL15bYS16QS1aMC05X10rJC8pLnRlc3QodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdlbWFpbCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoL14oXFx3KykoW1xcLSsuXVtcXHddKykqQChcXHdbXFwtXFx3XSpcXC4pezEsNX0oW0EtWmEtel0pezIsNn0kLykudGVzdCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3VybCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoLygoKF5odHRwcz8pfCheZnRwKSk6XFwvXFwvKFtcXC1cXHddK1xcLikrXFx3ezIsM30oXFwvWyVcXC1cXHddKyhcXC5cXHd7Mix9KT8pKigoW1xcd1xcLVxcLlxcP1xcXFxcXC8rQCYjO2B+PSUhXSopKFxcLlxcd3syLH0pPykqXFwvPykvaSkudGVzdCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2lwYWRkcmVzcyc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoL15cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfSQvKS50ZXN0KHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBoYW5kbGVycyA9IHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGJsdXJyaW5nIG91dCBvZiB0aGUgY29tcG9uZW50XHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfb25CbHVyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5yZW1vdmVDbGFzcygnbXMtY3RuLWZvY3VzJyk7XHJcbiAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xyXG4gICAgICAgICAgICAgICAgX2hhc0ZvY3VzID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBpZihtcy5nZXRSYXdWYWx1ZSgpICE9PSAnJyAmJiBjZmcuYWxsb3dGcmVlRW50cmllcyA9PT0gdHJ1ZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9iaiA9IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgIG9ialtjZmcuZGlzcGxheUZpZWxkXSA9IG9ialtjZmcudmFsdWVGaWVsZF0gPSBtcy5nZXRSYXdWYWx1ZSgpLnRyaW0oKTtcclxuICAgICAgICAgICAgICAgICAgICBtcy5hZGRUb1NlbGVjdGlvbihvYmopO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYobXMuaXNWYWxpZCgpID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hZGRDbGFzcyhjZmcuaW52YWxpZENscyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZihtcy5pbnB1dC52YWwoKSAhPT0gJycgJiYgY2ZnLmFsbG93RnJlZUVudHJpZXMgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuZW1wdHkoKTtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoJycpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2JsdXInLCBbbXNdKTtcclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBob3ZlcmluZyBhbiBlbGVtZW50IGluIHRoZSBjb21ib1xyXG4gICAgICAgICAgICAgKiBAcGFyYW0gZVxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX29uQ29tYm9JdGVtTW91c2VPdmVyOiBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgaWYoIXRhcmdldC5oYXNDbGFzcygnbXMtcmVzLWl0ZW0tZGlzYWJsZWQnKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guY2hpbGRyZW4oKS5yZW1vdmVDbGFzcygnbXMtcmVzLWl0ZW0tYWN0aXZlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmFkZENsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBhbiBpdGVtIGlzIGNob3NlbiBmcm9tIHRoZSBsaXN0XHJcbiAgICAgICAgICAgICAqIEBwYXJhbSBlXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfb25Db21ib0l0ZW1TZWxlY3RlZDogZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgIGlmKCF0YXJnZXQuaGFzQ2xhc3MoJ21zLXJlcy1pdGVtLWRpc2FibGVkJykpe1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3NlbGVjdEl0ZW0oJChlLmN1cnJlbnRUYXJnZXQpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBmb2N1c2luZyBvbiB0aGUgY29udGFpbmVyIGRpdi4gV2lsbCBmb2N1cyBvbiB0aGUgaW5wdXQgZmllbGQgaW5zdGVhZC5cclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9vbkZvY3VzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gY2xpY2tpbmcgb24gdGhlIGlucHV0IHRleHQgZmllbGRcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9vbklucHV0Q2xpY2s6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBpZiAobXMuaXNEaXNhYmxlZCgpID09PSBmYWxzZSAmJiBfaGFzRm9jdXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2ZnLnRvZ2dsZU9uQ2xpY2sgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNmZy5leHBhbmRlZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gZm9jdXNpbmcgb24gdGhlIGlucHV0IHRleHQgZmllbGQuXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfb25JbnB1dEZvY3VzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGlmKG1zLmlzRGlzYWJsZWQoKSA9PT0gZmFsc2UgJiYgIV9oYXNGb2N1cykge1xyXG4gICAgICAgICAgICAgICAgICAgIF9oYXNGb2N1cyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFkZENsYXNzKCdtcy1jdG4tZm9jdXMnKTtcclxuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoY2ZnLmludmFsaWRDbHMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgY3VyTGVuZ3RoID0gbXMuZ2V0UmF3VmFsdWUoKS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZE9uRm9jdXMgPT09IHRydWUpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmKF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLCBfc2VsZWN0aW9uLmxlbmd0aCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZihjdXJMZW5ndGggPCBjZmcubWluQ2hhcnMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcywgY2ZnLm1pbkNoYXJzIC0gY3VyTGVuZ3RoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdmb2N1cycsIFttc10pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIHRoZSB1c2VyIHByZXNzZXMgYSBrZXkgd2hpbGUgdGhlIGNvbXBvbmVudCBoYXMgZm9jdXNcclxuICAgICAgICAgICAgICogVGhpcyBpcyB3aGVyZSB3ZSB3YW50IHRvIGhhbmRsZSBhbGwga2V5cyB0aGF0IGRvbid0IHJlcXVpcmUgdGhlIHVzZXIgaW5wdXQgZmllbGRcclxuICAgICAgICAgICAgICogc2luY2UgaXQgaGFzbid0IHJlZ2lzdGVyZWQgdGhlIGtleSBoaXQgeWV0XHJcbiAgICAgICAgICAgICAqIEBwYXJhbSBlIGtleUV2ZW50XHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfb25LZXlEb3duOiBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjaGVjayBob3cgdGFiIHNob3VsZCBiZSBoYW5kbGVkXHJcbiAgICAgICAgICAgICAgICB2YXIgYWN0aXZlID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpLFxyXG4gICAgICAgICAgICAgICAgICAgIGZyZWVJbnB1dCA9IG1zLmlucHV0LnZhbCgpO1xyXG4gICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcigna2V5ZG93bicsIFttcywgZV0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGUua2V5Q29kZSA9PT0gS0VZQ09ERVMuVEFCICYmIChjZmcudXNlVGFiS2V5ID09PSBmYWxzZSB8fFxyXG4gICAgICAgICAgICAgICAgICAgIChjZmcudXNlVGFiS2V5ID09PSB0cnVlICYmIGFjdGl2ZS5sZW5ndGggPT09IDAgJiYgbXMuaW5wdXQudmFsKCkubGVuZ3RoID09PSAwKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5fb25CbHVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc3dpdGNoKGUua2V5Q29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuQkFDS1NQQUNFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihmcmVlSW5wdXQubGVuZ3RoID09PSAwICYmIG1zLmdldFNlbGVjdGlvbigpLmxlbmd0aCA+IDAgJiYgY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfc2VsZWN0aW9uLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdzZWxlY3Rpb25jaGFuZ2UnLCBbbXMsIG1zLmdldFNlbGVjdGlvbigpXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5hdHRyKCdwbGFjZWhvbGRlcicsIChjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgbXMuZ2V0VmFsdWUoKS5sZW5ndGggPiAwKSA/ICcnIDogY2ZnLnBsYWNlaG9sZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5UQUI6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5FU0M6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5FTlRFUjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnJlZUlucHV0ICE9PSAnJyB8fCBjZmcuZXhwYW5kZWQpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuQ09NTUE6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy51c2VDb21tYUtleSA9PT0gdHJ1ZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5DVFJMOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBfY3RybERvd24gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkRPV05BUlJPVzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9tb3ZlU2VsZWN0ZWRSb3coXCJkb3duXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLlVQQVJST1c6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fbW92ZVNlbGVjdGVkUm93KFwidXBcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gYSBrZXkgaXMgcmVsZWFzZWQgd2hpbGUgdGhlIGNvbXBvbmVudCBoYXMgZm9jdXNcclxuICAgICAgICAgICAgICogQHBhcmFtIGVcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9vbktleVVwOiBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZnJlZUlucHV0ID0gbXMuZ2V0UmF3VmFsdWUoKSxcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dFZhbGlkID0gJC50cmltKG1zLmlucHV0LnZhbCgpKS5sZW5ndGggPiAwICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICghY2ZnLm1heEVudHJ5TGVuZ3RoIHx8ICQudHJpbShtcy5pbnB1dC52YWwoKSkubGVuZ3RoIDw9IGNmZy5tYXhFbnRyeUxlbmd0aCksXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgb2JqID0ge307XHJcblxyXG4gICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcigna2V5dXAnLCBbbXMsIGVdKTtcclxuXHJcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RpbWVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBjb2xsYXBzZSBpZiBlc2NhcGUsIGJ1dCBrZWVwIGZvY3VzLlxyXG4gICAgICAgICAgICAgICAgaWYoZS5rZXlDb2RlID09PSBLRVlDT0RFUy5FU0MgJiYgY2ZnLmV4cGFuZGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guaGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gaWdub3JlIGEgYnVuY2ggb2Yga2V5c1xyXG4gICAgICAgICAgICAgICAgaWYoKGUua2V5Q29kZSA9PT0gS0VZQ09ERVMuVEFCICYmIGNmZy51c2VUYWJLZXkgPT09IGZhbHNlKSB8fCAoZS5rZXlDb2RlID4gS0VZQ09ERVMuRU5URVIgJiYgZS5rZXlDb2RlIDwgS0VZQ09ERVMuU1BBQ0UpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZS5rZXlDb2RlID09PSBLRVlDT0RFUy5DVFJMKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2N0cmxEb3duID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHN3aXRjaChlLmtleUNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLlVQQVJST1c6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5ET1dOQVJST1c6XHJcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuRU5URVI6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5UQUI6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5DT01NQTpcclxuICAgICAgICAgICAgICAgICAgICBpZihlLmtleUNvZGUgIT09IEtFWUNPREVTLkNPTU1BIHx8IGNmZy51c2VDb21tYUtleSA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSl7IC8vIGlmIGEgc2VsZWN0aW9uIGlzIHBlcmZvcm1lZCwgc2VsZWN0IGl0IGFuZCByZXNldCBmaWVsZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihzZWxlY3RlZC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0SXRlbShzZWxlY3RlZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIG5vIHNlbGVjdGlvbiBvciBpZiBmcmVldGV4dCBlbnRlcmVkIGFuZCBmcmVlIGVudHJpZXMgYWxsb3dlZCwgYWRkIG5ldyBvYmogdG8gc2VsZWN0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlucHV0VmFsaWQgPT09IHRydWUgJiYgY2ZnLmFsbG93RnJlZUVudHJpZXMgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ialtjZmcuZGlzcGxheUZpZWxkXSA9IG9ialtjZmcudmFsdWVGaWVsZF0gPSBmcmVlSW5wdXQudHJpbSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuYWRkVG9TZWxlY3Rpb24ob2JqKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7IC8vIHJlc2V0IGNvbWJvIHN1Z2dlc3Rpb25zXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcywgX3NlbGVjdGlvbi5sZW5ndGgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGZyZWVJbnB1dC5sZW5ndGggPCBjZmcubWluQ2hhcnMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLCBjZmcubWluQ2hhcnMgLSBmcmVlSW5wdXQubGVuZ3RoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZihjZmcubWF4RW50cnlMZW5ndGggJiYgZnJlZUlucHV0Lmxlbmd0aCA+IGNmZy5tYXhFbnRyeUxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4RW50cnlSZW5kZXJlci5jYWxsKHRoaXMsIGZyZWVJbnB1dC5sZW5ndGggLSBjZmcubWF4RW50cnlMZW5ndGgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5oZWxwZXIuaGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5taW5DaGFycyA8PSBmcmVlSW5wdXQubGVuZ3RoKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgY2ZnLnR5cGVEZWxheSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGNsaWNraW5nIHVwb24gY3Jvc3MgZm9yIGRlbGV0aW9uXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSBlXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfb25UYWdUcmlnZ2VyQ2xpY2s6IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgIG1zLnJlbW92ZUZyb21TZWxlY3Rpb24oJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoJ2pzb24nKSk7XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gY2xpY2tpbmcgb24gdGhlIHNtYWxsIHRyaWdnZXIgaW4gdGhlIHJpZ2h0XHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfb25UcmlnZ2VyQ2xpY2s6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaWYobXMuaXNEaXNhYmxlZCgpID09PSBmYWxzZSAmJiAhKGNmZy5leHBhbmRPbkZvY3VzID09PSB0cnVlICYmIF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ3RyaWdnZXJjbGljaycsIFttc10pO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjdXJMZW5ndGggPSBtcy5nZXRSYXdWYWx1ZSgpLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY3VyTGVuZ3RoID49IGNmZy5taW5DaGFycyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLCBjZmcubWluQ2hhcnMgLSBjdXJMZW5ndGgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiB0aGUgYnJvd3NlciB3aW5kb3cgaXMgcmVzaXplZFxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX29uV2luZG93UmVzaXplZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIHN0YXJ0dXAgcG9pbnRcclxuICAgICAgICBpZihlbGVtZW50ICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHNlbGYuX3JlbmRlcihlbGVtZW50KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgICQuZm4ubWFnaWNTdWdnZXN0ID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG4gICAgICAgIHZhciBvYmogPSAkKHRoaXMpO1xyXG5cclxuICAgICAgICBpZihvYmouc2l6ZSgpID09PSAxICYmIG9iai5kYXRhKCdtYWdpY1N1Z2dlc3QnKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqLmRhdGEoJ21hZ2ljU3VnZ2VzdCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgb2JqLmVhY2goZnVuY3Rpb24oaSkge1xyXG4gICAgICAgICAgICAvLyBhc3N1bWUgJCh0aGlzKSBpcyBhbiBlbGVtZW50XHJcbiAgICAgICAgICAgIHZhciBjbnRyID0gJCh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFJldHVybiBlYXJseSBpZiB0aGlzIGVsZW1lbnQgYWxyZWFkeSBoYXMgYSBwbHVnaW4gaW5zdGFuY2VcclxuICAgICAgICAgICAgaWYoY250ci5kYXRhKCdtYWdpY1N1Z2dlc3QnKSl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmKHRoaXMubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3NlbGVjdCcpeyAvLyByZW5kZXJpbmcgZnJvbSBzZWxlY3RcclxuICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgb3B0aW9ucy52YWx1ZSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgJC5lYWNoKHRoaXMuY2hpbGRyZW4sIGZ1bmN0aW9uKGluZGV4LCBjaGlsZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoY2hpbGQubm9kZU5hbWUgJiYgY2hpbGQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ29wdGlvbicpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmRhdGEucHVzaCh7aWQ6IGNoaWxkLnZhbHVlLCBuYW1lOiBjaGlsZC50ZXh0fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCQoY2hpbGQpLmF0dHIoJ3NlbGVjdGVkJykpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy52YWx1ZS5wdXNoKGNoaWxkLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgZGVmID0ge307XHJcbiAgICAgICAgICAgIC8vIHNldCB2YWx1ZXMgZnJvbSBET00gY29udGFpbmVyIGVsZW1lbnRcclxuICAgICAgICAgICAgJC5lYWNoKHRoaXMuYXR0cmlidXRlcywgZnVuY3Rpb24oaSwgYXR0KXtcclxuICAgICAgICAgICAgICAgIGRlZlthdHQubmFtZV0gPSBhdHQubmFtZSA9PT0gJ3ZhbHVlJyAmJiBhdHQudmFsdWUgIT09ICcnID8gSlNPTi5wYXJzZShhdHQudmFsdWUpIDogYXR0LnZhbHVlO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBmaWVsZCA9IG5ldyBNYWdpY1N1Z2dlc3QodGhpcywgJC5leHRlbmQoW10sICQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzLCBvcHRpb25zLCBkZWYpKTtcclxuICAgICAgICAgICAgY250ci5kYXRhKCdtYWdpY1N1Z2dlc3QnLCBmaWVsZCk7XHJcbiAgICAgICAgICAgIGZpZWxkLmNvbnRhaW5lci5kYXRhKCdtYWdpY1N1Z2dlc3QnLCBmaWVsZCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmKG9iai5zaXplKCkgPT09IDEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG9iai5kYXRhKCdtYWdpY1N1Z2dlc3QnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG9iajtcclxuICAgIH07XHJcblxyXG4gICAkLmZuLm1hZ2ljU3VnZ2VzdC5kZWZhdWx0cyA9IHt9O1xyXG59KShqUXVlcnkpO1xyXG4iXX0=
