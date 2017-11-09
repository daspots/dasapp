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

$('.close-icon').on('click',function() {
  $(this).closest('.card').css({"display":"none"});
  $(".recommender").fadeIn();
})
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

window.onload = function() {
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
}


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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNpdGUvYXBwLmNvZmZlZSIsInNpdGUvYXV0aC5jb2ZmZWUiLCJzaXRlL3ByZXR0eS1maWxlLmNvZmZlZSIsInNpdGUvcmVzb3VyY2UuY29mZmVlIiwic2l0ZS91c2VyLmNvZmZlZSIsImNvbW1vbi9hcGkuY29mZmVlIiwiY29tbW9uL3VwbG9hZC5jb2ZmZWUiLCJjb21tb24vdXRpbC5jb2ZmZWUiLCJmb2xsb3dfY29kZS5qcyIsImdpZmZmZXIuanMiLCJsb2FkLmpzIiwibWFzb25yeS5wa2dkLm1pbi5qcyIsInN0YXJfY29kZS5qcyIsInNpdGUvbmljb2xhc2JpemUtbWFnaWNzdWdnZXN0LTIzMGIwOGIvbWFnaWNzdWdnZXN0LW1pbi5qcyIsInNpdGUvbmljb2xhc2JpemUtbWFnaWNzdWdnZXN0LTIzMGIwOGIvbWFnaWNzdWdnZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0VBQUEsQ0FBQSxDQUFFLFNBQUE7V0FDQSxXQUFBLENBQUE7RUFEQSxDQUFGOztFQUdBLENBQUEsQ0FBRSxTQUFBO1dBQUcsQ0FBQSxDQUFFLFdBQUYsQ0FBYyxDQUFDLElBQWYsQ0FBb0IsU0FBQTthQUN2QixTQUFBLENBQUE7SUFEdUIsQ0FBcEI7RUFBSCxDQUFGOztFQUdBLENBQUEsQ0FBRSxTQUFBO1dBQUcsQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsSUFBcEIsQ0FBeUIsU0FBQTthQUM1QixjQUFBLENBQUE7SUFENEIsQ0FBekI7RUFBSCxDQUFGOztFQUdBLENBQUEsQ0FBRSxTQUFBO1dBQUcsQ0FBQSxDQUFFLGlCQUFGLENBQW9CLENBQUMsSUFBckIsQ0FBMEIsU0FBQTthQUM3QixlQUFBLENBQUE7SUFENkIsQ0FBMUI7RUFBSCxDQUFGOztFQUdBLENBQUEsQ0FBRSxTQUFBO1dBQUcsQ0FBQSxDQUFFLG9CQUFGLENBQXVCLENBQUMsSUFBeEIsQ0FBNkIsU0FBQTthQUNoQyxrQkFBQSxDQUFBO0lBRGdDLENBQTdCO0VBQUgsQ0FBRjs7RUFHQSxDQUFB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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlDQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzY3JpcHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkIC0+XG4gIGluaXRfY29tbW9uKClcblxuJCAtPiAkKCdodG1sLmF1dGgnKS5lYWNoIC0+XG4gIGluaXRfYXV0aCgpXG5cbiQgLT4gJCgnaHRtbC51c2VyLWxpc3QnKS5lYWNoIC0+XG4gIGluaXRfdXNlcl9saXN0KClcblxuJCAtPiAkKCdodG1sLnVzZXItbWVyZ2UnKS5lYWNoIC0+XG4gIGluaXRfdXNlcl9tZXJnZSgpXG5cbiQgLT4gJCgnaHRtbC5yZXNvdXJjZS1saXN0JykuZWFjaCAtPlxuICBpbml0X3Jlc291cmNlX2xpc3QoKVxuXG4kIC0+ICQoJ2h0bWwucmVzb3VyY2UtdmlldycpLmVhY2ggLT5cbiAgaW5pdF9yZXNvdXJjZV92aWV3KClcblxuJCAtPiAkKCdodG1sLnBvc3QtY3JlYXRlJykuZWFjaCAtPlxuICBpbml0X3Jlc291cmNlX3VwbG9hZCgpXG5cbiQgLT4gJCgnaHRtbC5yZWNvbW1lbmRlci1jcmVhdGUnKS5lYWNoIC0+XG4gIGluaXRfcmVzb3VyY2VfdXBsb2FkKClcblxuIiwid2luZG93LmluaXRfYXV0aCA9IC0+XG4gICQoJy5yZW1lbWJlcicpLmNoYW5nZSAtPlxuICAgIGJ1dHRvbnMgPSAkKCcuYnRuLXNvY2lhbCcpLnRvQXJyYXkoKS5jb25jYXQgJCgnLmJ0bi1zb2NpYWwtaWNvbicpLnRvQXJyYXkoKVxuICAgIGZvciBidXR0b24gaW4gYnV0dG9uc1xuICAgICAgaHJlZiA9ICQoYnV0dG9uKS5wcm9wICdocmVmJ1xuICAgICAgaWYgJCgnLnJlbWVtYmVyIGlucHV0JykuaXMgJzpjaGVja2VkJ1xuICAgICAgICAkKGJ1dHRvbikucHJvcCAnaHJlZicsIFwiI3tocmVmfSZyZW1lbWJlcj10cnVlXCJcbiAgICAgICAgJCgnI3JlbWVtYmVyJykucHJvcCAnY2hlY2tlZCcsIHRydWVcbiAgICAgIGVsc2VcbiAgICAgICAgJChidXR0b24pLnByb3AgJ2hyZWYnLCBocmVmLnJlcGxhY2UgJyZyZW1lbWJlcj10cnVlJywgJydcbiAgICAgICAgJCgnI3JlbWVtYmVyJykucHJvcCAnY2hlY2tlZCcsIGZhbHNlXG5cbiAgJCgnLnJlbWVtYmVyJykuY2hhbmdlKClcbiIsIiMgaHR0cDovL2Jsb2cuYW5vcmdhbi5jb20vMjAxMi8wOS8zMC9wcmV0dHktbXVsdGktZmlsZS11cGxvYWQtYm9vdHN0cmFwLWpxdWVyeS10d2lnLXNpbGV4L1xuaWYgJChcIi5wcmV0dHktZmlsZVwiKS5sZW5ndGhcbiAgJChcIi5wcmV0dHktZmlsZVwiKS5lYWNoICgpIC0+XG4gICAgcHJldHR5X2ZpbGUgPSAkKHRoaXMpXG4gICAgZmlsZV9pbnB1dCA9IHByZXR0eV9maWxlLmZpbmQoJ2lucHV0W3R5cGU9XCJmaWxlXCJdJylcbiAgICBmaWxlX2lucHV0LmhpZGUoKVxuICAgIGZpbGVfaW5wdXQuY2hhbmdlICgpIC0+XG4gICAgICBmaWxlcyA9IGZpbGVfaW5wdXRbMF0uZmlsZXNcbiAgICAgIGluZm8gPSBcIlwiXG4gICAgICBpZiBmaWxlcy5sZW5ndGggPiAxXG4gICAgICAgIGluZm8gPSBcIiN7ZmlsZXMubGVuZ3RofSBmaWxlcyBzZWxlY3RlZFwiXG4gICAgICBlbHNlXG4gICAgICAgIHBhdGggPSBmaWxlX2lucHV0LnZhbCgpLnNwbGl0KFwiXFxcXFwiKVxuICAgICAgICBpbmZvID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdXG4gICAgICBwcmV0dHlfZmlsZS5maW5kKFwiLmlucHV0LWdyb3VwIGlucHV0XCIpLnZhbChpbmZvKVxuICAgIHByZXR0eV9maWxlLmZpbmQoXCIuaW5wdXQtZ3JvdXBcIikuY2xpY2sgKGUpIC0+XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIGZpbGVfaW5wdXQuY2xpY2soKVxuICAgICAgJCh0aGlzKS5ibHVyKClcbiIsIndpbmRvdy5pbml0X3Jlc291cmNlX2xpc3QgPSAoKSAtPlxuICBpbml0X2RlbGV0ZV9yZXNvdXJjZV9idXR0b24oKVxuXG53aW5kb3cuaW5pdF9yZXNvdXJjZV92aWV3ID0gKCkgLT5cbiAgaW5pdF9kZWxldGVfcmVzb3VyY2VfYnV0dG9uKClcblxud2luZG93LmluaXRfcmVzb3VyY2VfdXBsb2FkID0gKCkgLT5cblxuICBpZiB3aW5kb3cuRmlsZSBhbmQgd2luZG93LkZpbGVMaXN0IGFuZCB3aW5kb3cuRmlsZVJlYWRlclxuICAgIHdpbmRvdy5maWxlX3VwbG9hZGVyID0gbmV3IEZpbGVVcGxvYWRlclxuICAgICAgdXBsb2FkX2hhbmRsZXI6IHVwbG9hZF9oYW5kbGVyXG4gICAgICBzZWxlY3RvcjogJCgnLmZpbGUnKVxuICAgICAgZHJvcF9hcmVhOiAkKCcuZHJvcC1hcmVhJylcbiAgICAgIGNvbmZpcm1fbWVzc2FnZTogJ0ZpbGVzIGFyZSBzdGlsbCBiZWluZyB1cGxvYWRlZC4nXG4gICAgICB1cGxvYWRfdXJsOiAkKCcuZmlsZScpLmRhdGEoJ2dldC11cGxvYWQtdXJsJylcbiAgICAgIGFsbG93ZWRfdHlwZXM6IFtdXG4gICAgICBtYXhfc2l6ZTogMTAyNCAqIDEwMjQgKiAxMDI0XG5cbnVwbG9hZF9oYW5kbGVyID1cbiAgcHJldmlldzogKGZpbGUpIC0+XG4gICAgJHJlc291cmNlID0gJCBcIlwiXCJcbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbC1sZy0yIGNvbC1tZC0zIGNvbC1zbS00IGNvbC14cy02XCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInRodW1ibmFpbFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByZXZpZXdcIj48L2Rpdj5cbiAgICAgICAgICAgIDxoNT4je2ZpbGUubmFtZX08L2g1PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzcy1iYXJcIiBzdHlsZT1cIndpZHRoOiAwJTtcIj48L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzLXRleHRcIj48L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIFwiXCJcIlxuICAgICRwcmV2aWV3ID0gJCgnLnByZXZpZXcnLCAkcmVzb3VyY2UpXG5cbiAgICBpZiBmaWxlX3VwbG9hZGVyLmFjdGl2ZV9maWxlcyA8IDE2IGFuZCBmaWxlLnR5cGUuaW5kZXhPZihcImltYWdlXCIpIGlzIDBcbiAgICAgIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICAgIHJlYWRlci5vbmxvYWQgPSAoZSkgPT5cbiAgICAgICAgJHByZXZpZXcuY3NzKCdiYWNrZ3JvdW5kLWltYWdlJywgXCJ1cmwoI3tlLnRhcmdldC5yZXN1bHR9KVwiKVxuICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoZmlsZSlcbiAgICBlbHNlXG4gICAgICAkcHJldmlldy50ZXh0KGZpbGUudHlwZSBvciAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJylcblxuICAgICQoJy5yZXNvdXJjZS11cGxvYWRzJykucHJlcGVuZCgkcmVzb3VyY2UpXG5cbiAgICAocHJvZ3Jlc3MsIHJlc291cmNlLCBlcnJvcikgPT5cbiAgICAgIGlmIGVycm9yXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmNzcygnd2lkdGgnLCAnMTAwJScpXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmFkZENsYXNzKCdwcm9ncmVzcy1iYXItZGFuZ2VyJylcbiAgICAgICAgaWYgZXJyb3IgPT0gJ3Rvb19iaWcnXG4gICAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCJGYWlsZWQhIFRvbyBiaWcsIG1heDogI3tzaXplX2h1bWFuKGZpbGVfdXBsb2FkZXIubWF4X3NpemUpfS5cIilcbiAgICAgICAgZWxzZSBpZiBlcnJvciA9PSAnd3JvbmdfdHlwZSdcbiAgICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIkZhaWxlZCEgV3JvbmcgZmlsZSB0eXBlLlwiKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoJ0ZhaWxlZCEnKVxuICAgICAgICByZXR1cm5cblxuICAgICAgaWYgcHJvZ3Jlc3MgPT0gMTAwLjAgYW5kIHJlc291cmNlXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmFkZENsYXNzKCdwcm9ncmVzcy1iYXItc3VjY2VzcycpXG4gICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiU3VjY2VzcyAje3NpemVfaHVtYW4oZmlsZS5zaXplKX1cIilcbiAgICAgICAgaWYgcmVzb3VyY2UuaW1hZ2VfdXJsIGFuZCAkcHJldmlldy50ZXh0KCkubGVuZ3RoID4gMFxuICAgICAgICAgICRwcmV2aWV3LmNzcygnYmFja2dyb3VuZC1pbWFnZScsIFwidXJsKCN7cmVzb3VyY2UuaW1hZ2VfdXJsfSlcIilcbiAgICAgICAgICAkcHJldmlldy50ZXh0KCcnKVxuICAgICAgZWxzZSBpZiBwcm9ncmVzcyA9PSAxMDAuMFxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5jc3MoJ3dpZHRoJywgJzEwMCUnKVxuICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIjEwMCUgLSBQcm9jZXNzaW5nLi5cIilcbiAgICAgIGVsc2VcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuY3NzKCd3aWR0aCcsIFwiI3twcm9ncmVzc30lXCIpXG4gICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiI3twcm9ncmVzc30lIG9mICN7c2l6ZV9odW1hbihmaWxlLnNpemUpfVwiKVxuXG5cbndpbmRvdy5pbml0X2RlbGV0ZV9yZXNvdXJjZV9idXR0b24gPSAoKSAtPlxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5idG4tZGVsZXRlJywgKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgaWYgY29uZmlybSgnUHJlc3MgT0sgdG8gZGVsZXRlIHRoZSByZXNvdXJjZScpXG4gICAgICAkKHRoaXMpLmF0dHIoJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJylcbiAgICAgIGFwaV9jYWxsICdERUxFVEUnLCAkKHRoaXMpLmRhdGEoJ2FwaS11cmwnKSwgKGVyciwgcmVzdWx0KSA9PlxuICAgICAgICBpZiBlcnJcbiAgICAgICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoJ2Rpc2FibGVkJylcbiAgICAgICAgICBMT0cgJ1NvbWV0aGluZyB3ZW50IHRlcnJpYmx5IHdyb25nIGR1cmluZyBkZWxldGUhJywgZXJyXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIHRhcmdldCA9ICQodGhpcykuZGF0YSgndGFyZ2V0JylcbiAgICAgICAgcmVkaXJlY3RfdXJsID0gJCh0aGlzKS5kYXRhKCdyZWRpcmVjdC11cmwnKVxuICAgICAgICBpZiB0YXJnZXRcbiAgICAgICAgICAkKFwiI3t0YXJnZXR9XCIpLnJlbW92ZSgpXG4gICAgICAgIGlmIHJlZGlyZWN0X3VybFxuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVkaXJlY3RfdXJsIiwid2luZG93LmluaXRfdXNlcl9saXN0ID0gLT5cbiAgaW5pdF91c2VyX3NlbGVjdGlvbnMoKVxuICBpbml0X3VzZXJfZGVsZXRlX2J0bigpXG4gIGluaXRfdXNlcl9tZXJnZV9idG4oKVxuXG5cbmluaXRfdXNlcl9zZWxlY3Rpb25zID0gLT5cbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cbiAgICB1c2VyX3NlbGVjdF9yb3cgJCh0aGlzKVxuXG4gICQoJyNzZWxlY3QtYWxsJykuY2hhbmdlIC0+XG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLnByb3AgJ2NoZWNrZWQnLCAkKHRoaXMpLmlzICc6Y2hlY2tlZCdcbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykuZWFjaCAtPlxuICAgICAgdXNlcl9zZWxlY3Rfcm93ICQodGhpcylcblxuICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykuY2hhbmdlIC0+XG4gICAgdXNlcl9zZWxlY3Rfcm93ICQodGhpcylcblxuXG51c2VyX3NlbGVjdF9yb3cgPSAoJGVsZW1lbnQpIC0+XG4gIHVwZGF0ZV91c2VyX3NlbGVjdGlvbnMoKVxuICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykuZWFjaCAtPlxuICAgIGlkID0gJGVsZW1lbnQudmFsKClcbiAgICAkKFwiIyN7aWR9XCIpLnRvZ2dsZUNsYXNzICd3YXJuaW5nJywgJGVsZW1lbnQuaXMgJzpjaGVja2VkJ1xuXG5cbnVwZGF0ZV91c2VyX3NlbGVjdGlvbnMgPSAtPlxuICBzZWxlY3RlZCA9ICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmxlbmd0aFxuICAkKCcjdXNlci1hY3Rpb25zJykudG9nZ2xlQ2xhc3MgJ2hpZGRlbicsIHNlbGVjdGVkID09IDBcbiAgJCgnI3VzZXItbWVyZ2UnKS50b2dnbGVDbGFzcyAnaGlkZGVuJywgc2VsZWN0ZWQgPCAyXG4gIGlmIHNlbGVjdGVkIGlzIDBcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCBmYWxzZVxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnY2hlY2tlZCcsIGZhbHNlXG4gIGVsc2UgaWYgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpub3QoOmNoZWNrZWQpJykubGVuZ3RoIGlzIDBcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCBmYWxzZVxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnY2hlY2tlZCcsIHRydWVcbiAgZWxzZVxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnaW5kZXRlcm1pbmF0ZScsIHRydWVcblxuXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIERlbGV0ZSBVc2VycyBTdHVmZlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuaW5pdF91c2VyX2RlbGV0ZV9idG4gPSAtPlxuICAkKCcjdXNlci1kZWxldGUnKS5jbGljayAoZSkgLT5cbiAgICBjbGVhcl9ub3RpZmljYXRpb25zKClcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBjb25maXJtX21lc3NhZ2UgPSAoJCh0aGlzKS5kYXRhICdjb25maXJtJykucmVwbGFjZSAne3VzZXJzfScsICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmxlbmd0aFxuICAgIGlmIGNvbmZpcm0gY29uZmlybV9tZXNzYWdlXG4gICAgICB1c2VyX2tleXMgPSBbXVxuICAgICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykuZWFjaCAtPlxuICAgICAgICAkKHRoaXMpLmF0dHIgJ2Rpc2FibGVkJywgdHJ1ZVxuICAgICAgICB1c2VyX2tleXMucHVzaCAkKHRoaXMpLnZhbCgpXG4gICAgICBkZWxldGVfdXJsID0gJCh0aGlzKS5kYXRhICdhcGktdXJsJ1xuICAgICAgc3VjY2Vzc19tZXNzYWdlID0gJCh0aGlzKS5kYXRhICdzdWNjZXNzJ1xuICAgICAgZXJyb3JfbWVzc2FnZSA9ICQodGhpcykuZGF0YSAnZXJyb3InXG4gICAgICBhcGlfY2FsbCAnREVMRVRFJywgZGVsZXRlX3VybCwge3VzZXJfa2V5czogdXNlcl9rZXlzLmpvaW4oJywnKX0sIChlcnIsIHJlc3VsdCkgLT5cbiAgICAgICAgaWYgZXJyXG4gICAgICAgICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpkaXNhYmxlZCcpLnJlbW92ZUF0dHIgJ2Rpc2FibGVkJ1xuICAgICAgICAgIHNob3dfbm90aWZpY2F0aW9uIGVycm9yX21lc3NhZ2UucmVwbGFjZSgne3VzZXJzfScsIHVzZXJfa2V5cy5sZW5ndGgpLCAnZGFuZ2VyJ1xuICAgICAgICAgIHJldHVyblxuICAgICAgICAkKFwiIyN7cmVzdWx0LmpvaW4oJywgIycpfVwiKS5mYWRlT3V0IC0+XG4gICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKVxuICAgICAgICAgIHVwZGF0ZV91c2VyX3NlbGVjdGlvbnMoKVxuICAgICAgICAgIHNob3dfbm90aWZpY2F0aW9uIHN1Y2Nlc3NfbWVzc2FnZS5yZXBsYWNlKCd7dXNlcnN9JywgdXNlcl9rZXlzLmxlbmd0aCksICdzdWNjZXNzJ1xuXG5cbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgTWVyZ2UgVXNlcnMgU3R1ZmZcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbndpbmRvdy5pbml0X3VzZXJfbWVyZ2UgPSAtPlxuICB1c2VyX2tleXMgPSAkKCcjdXNlcl9rZXlzJykudmFsKClcbiAgYXBpX3VybCA9ICQoJy5hcGktdXJsJykuZGF0YSAnYXBpLXVybCdcbiAgYXBpX2NhbGwgJ0dFVCcsIGFwaV91cmwsIHt1c2VyX2tleXM6IHVzZXJfa2V5c30sIChlcnJvciwgcmVzdWx0KSAtPlxuICAgIGlmIGVycm9yXG4gICAgICBMT0cgJ1NvbWV0aGluZyB3ZW50IHRlcnJpYmx5IHdyb25nJ1xuICAgICAgcmV0dXJuXG4gICAgd2luZG93LnVzZXJfZGJzID0gcmVzdWx0XG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLnJlbW92ZUF0dHIgJ2Rpc2FibGVkJ1xuXG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5jaGFuZ2UgKGV2ZW50KSAtPlxuICAgIHVzZXJfa2V5ID0gJChldmVudC5jdXJyZW50VGFyZ2V0KS52YWwoKVxuICAgIHNlbGVjdF9kZWZhdWx0X3VzZXIgdXNlcl9rZXlcblxuXG5zZWxlY3RfZGVmYXVsdF91c2VyID0gKHVzZXJfa2V5KSAtPlxuICAkKCcudXNlci1yb3cnKS5yZW1vdmVDbGFzcygnc3VjY2VzcycpLmFkZENsYXNzICdkYW5nZXInXG4gICQoXCIjI3t1c2VyX2tleX1cIikucmVtb3ZlQ2xhc3MoJ2RhbmdlcicpLmFkZENsYXNzICdzdWNjZXNzJ1xuXG4gIGZvciB1c2VyX2RiIGluIHVzZXJfZGJzXG4gICAgaWYgdXNlcl9rZXkgPT0gdXNlcl9kYi5rZXlcbiAgICAgICQoJ2lucHV0W25hbWU9dXNlcl9rZXldJykudmFsIHVzZXJfZGIua2V5XG4gICAgICAkKCdpbnB1dFtuYW1lPXVzZXJuYW1lXScpLnZhbCB1c2VyX2RiLnVzZXJuYW1lXG4gICAgICAkKCdpbnB1dFtuYW1lPW5hbWVdJykudmFsIHVzZXJfZGIubmFtZVxuICAgICAgJCgnaW5wdXRbbmFtZT1lbWFpbF0nKS52YWwgdXNlcl9kYi5lbWFpbFxuICAgICAgYnJlYWtcblxuXG5pbml0X3VzZXJfbWVyZ2VfYnRuID0gLT5cbiAgJCgnI3VzZXItbWVyZ2UnKS5jbGljayAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICB1c2VyX2tleXMgPSBbXVxuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmVhY2ggLT5cbiAgICAgIHVzZXJfa2V5cy5wdXNoICQodGhpcykudmFsKClcbiAgICB1c2VyX21lcmdlX3VybCA9ICQodGhpcykuZGF0YSAndXNlci1tZXJnZS11cmwnXG4gICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBcIiN7dXNlcl9tZXJnZV91cmx9P3VzZXJfa2V5cz0je3VzZXJfa2V5cy5qb2luKCcsJyl9XCJcbiIsIndpbmRvdy5hcGlfY2FsbCA9IChtZXRob2QsIHVybCwgcGFyYW1zLCBkYXRhLCBjYWxsYmFjaykgLT5cbiAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBkYXRhIHx8IHBhcmFtc1xuICBkYXRhID0gZGF0YSB8fCBwYXJhbXNcbiAgaWYgYXJndW1lbnRzLmxlbmd0aCA9PSA0XG4gICAgZGF0YSA9IHVuZGVmaW5lZFxuICBpZiBhcmd1bWVudHMubGVuZ3RoID09ICAzXG4gICAgcGFyYW1zID0gdW5kZWZpbmVkXG4gICAgZGF0YSA9IHVuZGVmaW5lZFxuICBwYXJhbXMgPSBwYXJhbXMgfHwge31cbiAgZm9yIGssIHYgb2YgcGFyYW1zXG4gICAgZGVsZXRlIHBhcmFtc1trXSBpZiBub3Qgdj9cbiAgc2VwYXJhdG9yID0gaWYgdXJsLnNlYXJjaCgnXFxcXD8nKSA+PSAwIHRoZW4gJyYnIGVsc2UgJz8nXG4gICQuYWpheFxuICAgIHR5cGU6IG1ldGhvZFxuICAgIHVybDogXCIje3VybH0je3NlcGFyYXRvcn0jeyQucGFyYW0gcGFyYW1zfVwiXG4gICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIGFjY2VwdHM6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICBkYXRhOiBpZiBkYXRhIHRoZW4gSlNPTi5zdHJpbmdpZnkoZGF0YSkgZWxzZSB1bmRlZmluZWRcbiAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgIGlmIGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJ1xuICAgICAgICBtb3JlID0gdW5kZWZpbmVkXG4gICAgICAgIGlmIGRhdGEubmV4dF91cmxcbiAgICAgICAgICBtb3JlID0gKGNhbGxiYWNrKSAtPiBhcGlfY2FsbChtZXRob2QsIGRhdGEubmV4dF91cmwsIHt9LCBjYWxsYmFjaylcbiAgICAgICAgY2FsbGJhY2s/IHVuZGVmaW5lZCwgZGF0YS5yZXN1bHQsIG1vcmVcbiAgICAgIGVsc2VcbiAgICAgICAgY2FsbGJhY2s/IGRhdGFcbiAgICBlcnJvcjogKGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93bikgLT5cbiAgICAgIGVycm9yID1cbiAgICAgICAgZXJyb3JfY29kZTogJ2FqYXhfZXJyb3InXG4gICAgICAgIHRleHRfc3RhdHVzOiB0ZXh0U3RhdHVzXG4gICAgICAgIGVycm9yX3Rocm93bjogZXJyb3JUaHJvd25cbiAgICAgICAganFYSFI6IGpxWEhSXG4gICAgICB0cnlcbiAgICAgICAgZXJyb3IgPSAkLnBhcnNlSlNPTihqcVhIUi5yZXNwb25zZVRleHQpIGlmIGpxWEhSLnJlc3BvbnNlVGV4dFxuICAgICAgY2F0Y2ggZVxuICAgICAgICBlcnJvciA9IGVycm9yXG4gICAgICBMT0cgJ2FwaV9jYWxsIGVycm9yJywgZXJyb3JcbiAgICAgIGNhbGxiYWNrPyBlcnJvclxuIiwiKC0+XG4gIGNsYXNzIHdpbmRvdy5GaWxlVXBsb2FkZXJcbiAgICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zKSAtPlxuICAgICAgQHVwbG9hZF9oYW5kbGVyID0gQG9wdGlvbnMudXBsb2FkX2hhbmRsZXJcbiAgICAgIEBzZWxlY3RvciA9IEBvcHRpb25zLnNlbGVjdG9yXG4gICAgICBAZHJvcF9hcmVhID0gQG9wdGlvbnMuZHJvcF9hcmVhXG4gICAgICBAdXBsb2FkX3VybCA9IEBvcHRpb25zLnVwbG9hZF91cmwgb3IgXCIvYXBpL3YxI3t3aW5kb3cubG9jYXRpb24ucGF0aG5hbWV9XCJcbiAgICAgIEBjb25maXJtX21lc3NhZ2UgPSBAb3B0aW9ucy5jb25maXJtX21lc3NhZ2Ugb3IgJ0ZpbGVzIGFyZSBzdGlsbCBiZWluZyB1cGxvYWRlZC4nXG4gICAgICBAYWxsb3dlZF90eXBlcyA9IEBvcHRpb25zLmFsbG93ZWRfdHlwZXNcbiAgICAgIEBtYXhfc2l6ZSA9IEBvcHRpb25zLm1heF9zaXplXG5cbiAgICAgIEBhY3RpdmVfZmlsZXMgPSAwXG5cbiAgICAgIEBzZWxlY3Rvcj8uYmluZCAnY2hhbmdlJywgKGUpID0+XG4gICAgICAgIEBmaWxlX3NlbGVjdF9oYW5kbGVyKGUpXG5cbiAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICBpZiBAZHJvcF9hcmVhPyBhbmQgeGhyLnVwbG9hZFxuICAgICAgICBAZHJvcF9hcmVhLm9uICdkcmFnb3ZlcicsIEBmaWxlX2RyYWdfaG92ZXJcbiAgICAgICAgQGRyb3BfYXJlYS5vbiAnZHJhZ2xlYXZlJywgQGZpbGVfZHJhZ19ob3ZlclxuICAgICAgICBAZHJvcF9hcmVhLm9uICdkcm9wJywgKGUpID0+XG4gICAgICAgICAgQGZpbGVfc2VsZWN0X2hhbmRsZXIgZVxuICAgICAgICBAZHJvcF9hcmVhLnNob3coKVxuXG4gICAgICB3aW5kb3cub25iZWZvcmV1bmxvYWQgPSA9PlxuICAgICAgICBpZiBAY29uZmlybV9tZXNzYWdlPyBhbmQgQGFjdGl2ZV9maWxlcyA+IDBcbiAgICAgICAgICByZXR1cm4gQGNvbmZpcm1fbWVzc2FnZVxuXG4gICAgZmlsZV9kcmFnX2hvdmVyOiAoZSkgPT5cbiAgICAgIGlmIG5vdCBAZHJvcF9hcmVhP1xuICAgICAgICByZXR1cm5cbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgaWYgZS50eXBlIGlzICdkcmFnb3ZlcidcbiAgICAgICAgQGRyb3BfYXJlYS5hZGRDbGFzcyAnZHJhZy1ob3ZlcidcbiAgICAgIGVsc2VcbiAgICAgICAgQGRyb3BfYXJlYS5yZW1vdmVDbGFzcyAnZHJhZy1ob3ZlcidcblxuICAgIGZpbGVfc2VsZWN0X2hhbmRsZXI6IChlKSA9PlxuICAgICAgQGZpbGVfZHJhZ19ob3ZlcihlKVxuICAgICAgZmlsZXMgPSBlLm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyPy5maWxlcyBvciBlLnRhcmdldD8uZmlsZXMgb3IgZS5kYXRhVHJhbnNmZXI/LmZpbGVzXG4gICAgICBpZiBmaWxlcz8ubGVuZ3RoID4gMFxuICAgICAgICBAdXBsb2FkX2ZpbGVzKGZpbGVzKVxuXG4gICAgdXBsb2FkX2ZpbGVzOiAoZmlsZXMpID0+XG4gICAgICBAZ2V0X3VwbG9hZF91cmxzIGZpbGVzLmxlbmd0aCwgKGVycm9yLCB1cmxzKSA9PlxuICAgICAgICBpZiBlcnJvclxuICAgICAgICAgIGNvbnNvbGUubG9nICdFcnJvciBnZXR0aW5nIFVSTHMnLCBlcnJvclxuICAgICAgICAgIHJldHVyblxuICAgICAgICBAcHJvY2Vzc19maWxlcyBmaWxlcywgdXJscywgMFxuXG4gICAgZ2V0X3VwbG9hZF91cmxzOiAobiwgY2FsbGJhY2spID0+XG4gICAgICByZXR1cm4gaWYgbiA8PSAwXG4gICAgICBhcGlfY2FsbCAnR0VUJywgQHVwbG9hZF91cmwsIHtjb3VudDogbn0sIChlcnJvciwgcmVzdWx0KSAtPlxuICAgICAgICBpZiBlcnJvclxuICAgICAgICAgIGNhbGxiYWNrIGVycm9yXG4gICAgICAgICAgdGhyb3cgZXJyb3JcbiAgICAgICAgY2FsbGJhY2sgdW5kZWZpbmVkLCByZXN1bHRcblxuICAgIHByb2Nlc3NfZmlsZXM6IChmaWxlcywgdXJscywgaSkgPT5cbiAgICAgIHJldHVybiBpZiBpID49IGZpbGVzLmxlbmd0aFxuICAgICAgQHVwbG9hZF9maWxlIGZpbGVzW2ldLCB1cmxzW2ldLnVwbG9hZF91cmwsIEB1cGxvYWRfaGFuZGxlcj8ucHJldmlldyhmaWxlc1tpXSksICgpID0+XG4gICAgICAgIEBwcm9jZXNzX2ZpbGVzIGZpbGVzLCB1cmxzLCBpICsgMSwgQHVwbG9hZF9oYW5kbGVyP1xuXG4gICAgdXBsb2FkX2ZpbGU6IChmaWxlLCB1cmwsIHByb2dyZXNzLCBjYWxsYmFjaykgPT5cbiAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICBpZiBAYWxsb3dlZF90eXBlcz8ubGVuZ3RoID4gMFxuICAgICAgICBpZiBmaWxlLnR5cGUgbm90IGluIEBhbGxvd2VkX3R5cGVzXG4gICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAnd3JvbmdfdHlwZSdcbiAgICAgICAgICBjYWxsYmFjaygpXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgIGlmIEBtYXhfc2l6ZT9cbiAgICAgICAgaWYgZmlsZS5zaXplID4gQG1heF9zaXplXG4gICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAndG9vX2JpZydcbiAgICAgICAgICBjYWxsYmFjaygpXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICMgJCgnI2ltYWdlJykudmFsKGZpbGUubmFtZSk7XG4gICAgICB4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIgJ3Byb2dyZXNzJywgKGV2ZW50KSAtPlxuICAgICAgICBwcm9ncmVzcyBwYXJzZUludCBldmVudC5sb2FkZWQgLyBldmVudC50b3RhbCAqIDEwMC4wXG5cbiAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoZXZlbnQpID0+XG4gICAgICAgIGlmIHhoci5yZWFkeVN0YXRlID09IDRcbiAgICAgICAgICBpZiB4aHIuc3RhdHVzID09IDIwMFxuICAgICAgICAgICAgcmVzcG9uc2UgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpXG4gICAgICAgICAgICBwcm9ncmVzcyAxMDAuMCwgcmVzcG9uc2UucmVzdWx0XG4gICAgICAgICAgICAjIC8vJCgnI2NvbnRlbnQnKS52YWwoeGhyLnJlc3BvbnNlVGV4dClcbiAgICAgICAgICAgICQoJyNpbWFnZScpLnZhbCgkKCcjaW1hZ2UnKS52YWwoKSAgKyByZXNwb25zZS5yZXN1bHQuaWQgKyAnOycpO1xuICAgICAgICAgICAgQGFjdGl2ZV9maWxlcyAtPSAxXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAnZXJyb3InXG4gICAgICAgICAgICBAYWN0aXZlX2ZpbGVzIC09IDFcblxuICAgICAgeGhyLm9wZW4gJ1BPU1QnLCB1cmwsIHRydWVcbiAgICAgIGRhdGEgPSBuZXcgRm9ybURhdGEoKVxuICAgICAgZGF0YS5hcHBlbmQgJ2ZpbGUnLCBmaWxlXG4gICAgICB4aHIuc2VuZCBkYXRhXG4gICAgICBjYWxsYmFjaygpXG4pKCkiLCJ3aW5kb3cuTE9HID0gLT5cbiAgY29uc29sZT8ubG9nPyBhcmd1bWVudHMuLi5cblxuXG53aW5kb3cuaW5pdF9jb21tb24gPSAtPlxuICBpbml0X2xvYWRpbmdfYnV0dG9uKClcbiAgaW5pdF9jb25maXJtX2J1dHRvbigpXG4gIGluaXRfcGFzc3dvcmRfc2hvd19idXR0b24oKVxuICBpbml0X3RpbWUoKVxuICBpbml0X2Fubm91bmNlbWVudCgpXG4gIGluaXRfcm93X2xpbmsoKVxuXG5cbndpbmRvdy5pbml0X2xvYWRpbmdfYnV0dG9uID0gLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWxvYWRpbmcnLCAtPlxuICAgICQodGhpcykuYnV0dG9uICdsb2FkaW5nJ1xuXG5cbndpbmRvdy5pbml0X2NvbmZpcm1fYnV0dG9uID0gLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWNvbmZpcm0nLCAtPlxuICAgIGlmIG5vdCBjb25maXJtICQodGhpcykuZGF0YSgnbWVzc2FnZScpIG9yICdBcmUgeW91IHN1cmU/J1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuXG5cbndpbmRvdy5pbml0X3Bhc3N3b3JkX3Nob3dfYnV0dG9uID0gLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLXBhc3N3b3JkLXNob3cnLCAtPlxuICAgICR0YXJnZXQgPSAkKCQodGhpcykuZGF0YSAndGFyZ2V0JylcbiAgICAkdGFyZ2V0LmZvY3VzKClcbiAgICBpZiAkKHRoaXMpLmhhc0NsYXNzICdhY3RpdmUnXG4gICAgICAkdGFyZ2V0LmF0dHIgJ3R5cGUnLCAncGFzc3dvcmQnXG4gICAgZWxzZVxuICAgICAgJHRhcmdldC5hdHRyICd0eXBlJywgJ3RleHQnXG5cblxud2luZG93LmluaXRfdGltZSA9IC0+XG4gIGlmICQoJ3RpbWUnKS5sZW5ndGggPiAwXG4gICAgcmVjYWxjdWxhdGUgPSAtPlxuICAgICAgJCgndGltZVtkYXRldGltZV0nKS5lYWNoIC0+XG4gICAgICAgIGRhdGUgPSBtb21lbnQudXRjICQodGhpcykuYXR0ciAnZGF0ZXRpbWUnXG4gICAgICAgIGRpZmYgPSBtb21lbnQoKS5kaWZmIGRhdGUgLCAnZGF5cydcbiAgICAgICAgaWYgZGlmZiA+IDI1XG4gICAgICAgICAgJCh0aGlzKS50ZXh0IGRhdGUubG9jYWwoKS5mb3JtYXQgJ1lZWVktTU0tREQnXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAkKHRoaXMpLnRleHQgZGF0ZS5mcm9tTm93KClcbiAgICAgICAgJCh0aGlzKS5hdHRyICd0aXRsZScsIGRhdGUubG9jYWwoKS5mb3JtYXQgJ2RkZGQsIE1NTU0gRG8gWVlZWSwgSEg6bW06c3MgWidcbiAgICAgIHNldFRpbWVvdXQgYXJndW1lbnRzLmNhbGxlZSwgMTAwMCAqIDQ1XG4gICAgcmVjYWxjdWxhdGUoKVxuXG5cbndpbmRvdy5pbml0X2Fubm91bmNlbWVudCA9IC0+XG4gICQoJy5hbGVydC1hbm5vdW5jZW1lbnQgYnV0dG9uLmNsb3NlJykuY2xpY2sgLT5cbiAgICBzZXNzaW9uU3RvcmFnZT8uc2V0SXRlbSAnY2xvc2VkQW5ub3VuY2VtZW50JywgJCgnLmFsZXJ0LWFubm91bmNlbWVudCcpLmh0bWwoKVxuXG4gIGlmIHNlc3Npb25TdG9yYWdlPy5nZXRJdGVtKCdjbG9zZWRBbm5vdW5jZW1lbnQnKSAhPSAkKCcuYWxlcnQtYW5ub3VuY2VtZW50JykuaHRtbCgpXG4gICAgJCgnLmFsZXJ0LWFubm91bmNlbWVudCcpLnNob3coKVxuXG5cbndpbmRvdy5pbml0X3Jvd19saW5rID0gLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcucm93LWxpbmsnLCAtPlxuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJCh0aGlzKS5kYXRhICdocmVmJ1xuXG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLm5vdC1saW5rJywgKGUpIC0+XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuXG5cbndpbmRvdy5jbGVhcl9ub3RpZmljYXRpb25zID0gLT5cbiAgJCgnI25vdGlmaWNhdGlvbnMnKS5lbXB0eSgpXG5cblxud2luZG93LnNob3dfbm90aWZpY2F0aW9uID0gKG1lc3NhZ2UsIGNhdGVnb3J5PSd3YXJuaW5nJykgLT5cbiAgY2xlYXJfbm90aWZpY2F0aW9ucygpXG4gIHJldHVybiBpZiBub3QgbWVzc2FnZVxuXG4gICQoJyNub3RpZmljYXRpb25zJykuYXBwZW5kIFwiXCJcIlxuICAgICAgPGRpdiBjbGFzcz1cImFsZXJ0IGFsZXJ0LWRpc21pc3NhYmxlIGFsZXJ0LSN7Y2F0ZWdvcnl9XCI+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY2xvc2VcIiBkYXRhLWRpc21pc3M9XCJhbGVydFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPiZ0aW1lczs8L2J1dHRvbj5cbiAgICAgICAgI3ttZXNzYWdlfVxuICAgICAgPC9kaXY+XG4gICAgXCJcIlwiXG5cblxud2luZG93LnNpemVfaHVtYW4gPSAobmJ5dGVzKSAtPlxuICBmb3Igc3VmZml4IGluIFsnQicsICdLQicsICdNQicsICdHQicsICdUQiddXG4gICAgaWYgbmJ5dGVzIDwgMTAwMFxuICAgICAgaWYgc3VmZml4ID09ICdCJ1xuICAgICAgICByZXR1cm4gXCIje25ieXRlc30gI3tzdWZmaXh9XCJcbiAgICAgIHJldHVybiBcIiN7cGFyc2VJbnQobmJ5dGVzICogMTApIC8gMTB9ICN7c3VmZml4fVwiXG4gICAgbmJ5dGVzIC89IDEwMjQuMFxuIiwiXG5mdW5jdGlvbiBmb2xsb3dGdW5jdGlvbih4LCB5KSB7XG5cbiAgICBhcGlfdXJsID0gJy9hcGkvdjEvZm9sbG93LycgKyB5ICsgJy8nO1xuXG4gICAgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJsYWJlbC1kZWZhdWx0XCIpKXtcbiAgICAgICAgIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwibm90LWxvZ2dlZC1pblwiKSl7XG4vLyAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmNzcyh7XCJ2aXNpYmlsaXR5XCI6XCJ2aXNpYmxlXCIsXCJkaXNwbGF5XCI6XCJibG9ja1wifSk7XG4gICAgICAgICAgICAkKFwiLnJlY29tbWVuZGVyXCIpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcbiAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmZhZGVJbigpO1xuLy8gICAgICAgICAgICAkKFwiI3Jlc3RhdXJhbnRcIikuZmFkZU91dCgpO1xuICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgeC5jbGFzc0xpc3QucmVtb3ZlKFwibGFiZWwtZGVmYXVsdFwiKVxuICAgICAgICAgICAgeC5jbGFzc0xpc3QuYWRkKFwibGFiZWwtc3VjY2Vzc1wiKVxuICAgICAgICAgICAgeC5pbm5lckhUTUw9J0ZPTExPV0lORyc7XG4gICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBhcGlfdXJsLCAgICAvL1lvdXIgYXBpIHVybFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ1BVVCcsICAgLy90eXBlIGlzIGFueSBIVFRQIG1ldGhvZFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAgICAgIC8vRGF0YSBhcyBqcyBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwibGFiZWwtc3VjY2Vzc1wiKSl7XG5cbiAgICAgICAgeC5jbGFzc0xpc3QucmVtb3ZlKFwibGFiZWwtc3VjY2Vzc1wiKVxuICAgICAgICB4LmNsYXNzTGlzdC5hZGQoXCJsYWJlbC1kZWZhdWx0XCIpXG4gICAgICAgIHguaW5uZXJIVE1MID0gJ0ZPTExPVyc7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICAgICAgICAgIHVybDogYXBpX3VybCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ0RFTEVURScsXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG8gc29tZXRoaW5nIHdpdGggdGhlIHJlc3VsdFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICA7XG4gICAgfVxuXG59XG5cbiQoJy5jbG9zZS1pY29uJykub24oJ2NsaWNrJyxmdW5jdGlvbigpIHtcbiAgJCh0aGlzKS5jbG9zZXN0KCcuY2FyZCcpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcbiAgJChcIi5yZWNvbW1lbmRlclwiKS5mYWRlSW4oKTtcbn0pIiwiLy8oZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCxmYWN0b3J5KXtpZih0eXBlb2YgZXhwb3J0cz09PVwib2JqZWN0XCImJnR5cGVvZiBtb2R1bGU9PT1cIm9iamVjdFwiKW1vZHVsZS5leHBvcnRzPWZhY3RvcnkoKTtlbHNlIGlmKHR5cGVvZiBkZWZpbmU9PT1cImZ1bmN0aW9uXCImJmRlZmluZS5hbWQpZGVmaW5lKFwiR2lmZmZlclwiLFtdLGZhY3RvcnkpO2Vsc2UgaWYodHlwZW9mIGV4cG9ydHM9PT1cIm9iamVjdFwiKWV4cG9ydHNbXCJHaWZmZmVyXCJdPWZhY3RvcnkoKTtlbHNlIHJvb3RbXCJHaWZmZmVyXCJdPWZhY3RvcnkoKX0pKHRoaXMsZnVuY3Rpb24oKXt2YXIgZD1kb2N1bWVudDt2YXIgcGxheVNpemU9NjA7dmFyIEdpZmZmZXI9ZnVuY3Rpb24ob3B0aW9ucyl7dmFyIGltYWdlcyxpPTAsZ2lmcz1bXTtpbWFnZXM9ZC5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtZ2lmZmZlcl1cIik7Zm9yKDtpPGltYWdlcy5sZW5ndGg7KytpKXByb2Nlc3MoaW1hZ2VzW2ldLGdpZnMsb3B0aW9ucyk7cmV0dXJuIGdpZnN9O2Z1bmN0aW9uIGZvcm1hdFVuaXQodil7cmV0dXJuIHYrKHYudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wP1wiXCI6XCJweFwiKX1mdW5jdGlvbiBwYXJzZVN0eWxlcyhzdHlsZXMpe3ZhciBzdHlsZXNTdHI9XCJcIjtmb3IocHJvcCBpbiBzdHlsZXMpc3R5bGVzU3RyKz1wcm9wK1wiOlwiK3N0eWxlc1twcm9wXStcIjtcIjtyZXR1cm4gc3R5bGVzU3RyfWZ1bmN0aW9uIGNyZWF0ZUNvbnRhaW5lcih3LGgsZWwsYWx0VGV4dCxvcHRzKXt2YXIgYWx0O3ZhciBjb249ZC5jcmVhdGVFbGVtZW50KFwiQlVUVE9OXCIpO3ZhciBjbHM9ZWwuZ2V0QXR0cmlidXRlKFwiY2xhc3NcIik7dmFyIGlkPWVsLmdldEF0dHJpYnV0ZShcImlkXCIpO3ZhciBwbGF5QnV0dG9uU3R5bGVzPW9wdHMmJm9wdHMucGxheUJ1dHRvblN0eWxlcz9wYXJzZVN0eWxlcyhvcHRzLnBsYXlCdXR0b25TdHlsZXMpOltcIndpZHRoOlwiK3BsYXlTaXplK1wicHhcIixcImhlaWdodDpcIitwbGF5U2l6ZStcInB4XCIsXCJib3JkZXItcmFkaXVzOlwiK3BsYXlTaXplLzIrXCJweFwiLFwiYmFja2dyb3VuZDpyZ2JhKDAsIDAsIDAsIDAuMylcIixcInBvc2l0aW9uOmFic29sdXRlXCIsXCJ0b3A6NTAlXCIsXCJsZWZ0OjUwJVwiLFwibWFyZ2luOi1cIitwbGF5U2l6ZS8yK1wicHhcIl0uam9pbihcIjtcIik7dmFyIHBsYXlCdXR0b25JY29uU3R5bGVzPW9wdHMmJm9wdHMucGxheUJ1dHRvbkljb25TdHlsZXM/cGFyc2VTdHlsZXMob3B0cy5wbGF5QnV0dG9uSWNvblN0eWxlcyk6W1wid2lkdGg6IDBcIixcImhlaWdodDogMFwiLFwiYm9yZGVyLXRvcDogMTRweCBzb2xpZCB0cmFuc3BhcmVudFwiLFwiYm9yZGVyLWJvdHRvbTogMTRweCBzb2xpZCB0cmFuc3BhcmVudFwiLFwiYm9yZGVyLWxlZnQ6IDE0cHggc29saWQgcmdiYSgwLCAwLCAwLCAwLjUpXCIsXCJwb3NpdGlvbjogYWJzb2x1dGVcIixcImxlZnQ6IDI2cHhcIixcInRvcDogMTZweFwiXS5qb2luKFwiO1wiKTtjbHM/Y29uLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsZWwuZ2V0QXR0cmlidXRlKFwiY2xhc3NcIikpOm51bGw7aWQ/Y29uLnNldEF0dHJpYnV0ZShcImlkXCIsZWwuZ2V0QXR0cmlidXRlKFwiaWRcIikpOm51bGw7Y29uLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcjtiYWNrZ3JvdW5kOm5vbmU7Ym9yZGVyOm5vbmU7cGFkZGluZzowO1wiKTtjb24uc2V0QXR0cmlidXRlKFwiYXJpYS1oaWRkZW5cIixcInRydWVcIik7dmFyIHBsYXk9ZC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO3BsYXkuc2V0QXR0cmlidXRlKFwiY2xhc3NcIixcImdpZmZmZXItcGxheS1idXR0b25cIik7cGxheS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLHBsYXlCdXR0b25TdHlsZXMpO3ZhciB0cm5nbD1kLmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7dHJuZ2wuc2V0QXR0cmlidXRlKFwic3R5bGVcIixwbGF5QnV0dG9uSWNvblN0eWxlcyk7cGxheS5hcHBlbmRDaGlsZCh0cm5nbCk7aWYoYWx0VGV4dCl7YWx0PWQuY3JlYXRlRWxlbWVudChcInBcIik7YWx0LnNldEF0dHJpYnV0ZShcImNsYXNzXCIsXCJnaWZmZmVyLWFsdFwiKTthbHQuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcImJvcmRlcjowO2NsaXA6cmVjdCgwIDAgMCAwKTtoZWlnaHQ6MXB4O292ZXJmbG93OmhpZGRlbjtwYWRkaW5nOjA7cG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MXB4O1wiKTthbHQuaW5uZXJUZXh0PWFsdFRleHQrXCIsIGltYWdlXCJ9Y29uLmFwcGVuZENoaWxkKHBsYXkpO2VsLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGNvbixlbCk7YWx0VGV4dD9jb24ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoYWx0LGNvbi5uZXh0U2libGluZyk6bnVsbDtyZXR1cm57Yzpjb24scDpwbGF5fX1mdW5jdGlvbiBjYWxjdWxhdGVQZXJjZW50YWdlRGltKGVsLHcsaCx3T3JpZyxoT3JpZyl7dmFyIHBhcmVudERpbVc9ZWwucGFyZW50Tm9kZS5vZmZzZXRXaWR0aDt2YXIgcGFyZW50RGltSD1lbC5wYXJlbnROb2RlLm9mZnNldEhlaWdodDt2YXIgcmF0aW89d09yaWcvaE9yaWc7aWYody50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjApe3c9cGFyc2VJbnQody50b1N0cmluZygpLnJlcGxhY2UoXCIlXCIsXCJcIikpO3c9dy8xMDAqcGFyZW50RGltVztoPXcvcmF0aW99ZWxzZSBpZihoLnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCl7aD1wYXJzZUludChoLnRvU3RyaW5nKCkucmVwbGFjZShcIiVcIixcIlwiKSk7aD1oLzEwMCpwYXJlbnREaW1XO3c9aC9yYXRpb31yZXR1cm57dzp3LGg6aH19ZnVuY3Rpb24gcHJvY2VzcyhlbCxnaWZzLG9wdGlvbnMpe3ZhciB1cmwsY29uLGMsdyxoLGR1cmF0aW9uLHBsYXksZ2lmLHBsYXlpbmc9ZmFsc2UsY2MsaXNDLGR1cmF0aW9uVGltZW91dCxkaW1zLGFsdFRleHQ7dXJsPWVsLmdldEF0dHJpYnV0ZShcImRhdGEtZ2lmZmZlclwiKTt3PWVsLmdldEF0dHJpYnV0ZShcImRhdGEtZ2lmZmZlci13aWR0aFwiKTtoPWVsLmdldEF0dHJpYnV0ZShcImRhdGEtZ2lmZmZlci1oZWlnaHRcIik7ZHVyYXRpb249ZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1naWZmZmVyLWR1cmF0aW9uXCIpO2FsdFRleHQ9ZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1naWZmZmVyLWFsdFwiKTtlbC5zdHlsZS5kaXNwbGF5PVwiYmxvY2tcIjtjPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7aXNDPSEhKGMuZ2V0Q29udGV4dCYmYy5nZXRDb250ZXh0KFwiMmRcIikpO2lmKHcmJmgmJmlzQyljYz1jcmVhdGVDb250YWluZXIodyxoLGVsLGFsdFRleHQsb3B0aW9ucyk7ZWwub25sb2FkPWZ1bmN0aW9uKCl7aWYoIWlzQylyZXR1cm47dz13fHxlbC53aWR0aDtoPWh8fGVsLmhlaWdodDtpZighY2MpY2M9Y3JlYXRlQ29udGFpbmVyKHcsaCxlbCxhbHRUZXh0LG9wdGlvbnMpO2Nvbj1jYy5jO3BsYXk9Y2MucDtkaW1zPWNhbGN1bGF0ZVBlcmNlbnRhZ2VEaW0oY29uLHcsaCxlbC53aWR0aCxlbC5oZWlnaHQpO2dpZnMucHVzaChjb24pO2Nvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIixmdW5jdGlvbigpe2NsZWFyVGltZW91dChkdXJhdGlvblRpbWVvdXQpO2lmKCFwbGF5aW5nKXtwbGF5aW5nPXRydWU7Z2lmPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJJTUdcIik7Z2lmLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ3aWR0aDoxMDAlO2hlaWdodDoxMDAlO1wiKTtnaWYuc2V0QXR0cmlidXRlKFwiZGF0YS11cmlcIixNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqMWU1KSsxKTtzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7Z2lmLnNyYz11cmx9LDApO2Nvbi5yZW1vdmVDaGlsZChwbGF5KTtjb24ucmVtb3ZlQ2hpbGQoYyk7Y29uLmFwcGVuZENoaWxkKGdpZik7aWYocGFyc2VJbnQoZHVyYXRpb24pPjApe2R1cmF0aW9uVGltZW91dD1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7cGxheWluZz1mYWxzZTtjb24uYXBwZW5kQ2hpbGQocGxheSk7Y29uLnJlbW92ZUNoaWxkKGdpZik7Y29uLmFwcGVuZENoaWxkKGMpO2dpZj1udWxsfSxkdXJhdGlvbil9fWVsc2V7cGxheWluZz1mYWxzZTtjb24uYXBwZW5kQ2hpbGQocGxheSk7Y29uLnJlbW92ZUNoaWxkKGdpZik7Y29uLmFwcGVuZENoaWxkKGMpO2dpZj1udWxsfX0pO2Mud2lkdGg9ZGltcy53O2MuaGVpZ2h0PWRpbXMuaDtjLmdldENvbnRleHQoXCIyZFwiKS5kcmF3SW1hZ2UoZWwsMCwwLGRpbXMudyxkaW1zLmgpO2Nvbi5hcHBlbmRDaGlsZChjKTtjb24uc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInBvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO3dpZHRoOlwiK2RpbXMudytcInB4O2hlaWdodDpcIitkaW1zLmgrXCJweDtiYWNrZ3JvdW5kOm5vbmU7Ym9yZGVyOm5vbmU7cGFkZGluZzowO1wiKTtjLnN0eWxlLndpZHRoPVwiMTAwJVwiO2Muc3R5bGUuaGVpZ2h0PVwiMTAwJVwiO2lmKHcudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wJiZoLnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCl7Y29uLnN0eWxlLndpZHRoPXc7Y29uLnN0eWxlLmhlaWdodD1ofWVsc2UgaWYody50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjApe2Nvbi5zdHlsZS53aWR0aD13O2Nvbi5zdHlsZS5oZWlnaHQ9XCJpbmhlcml0XCJ9ZWxzZSBpZihoLnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCl7Y29uLnN0eWxlLndpZHRoPVwiaW5oZXJpdFwiO2Nvbi5zdHlsZS5oZWlnaHQ9aH1lbHNle2Nvbi5zdHlsZS53aWR0aD1kaW1zLncrXCJweFwiO2Nvbi5zdHlsZS5oZWlnaHQ9ZGltcy5oK1wicHhcIn19O2VsLnNyYz11cmx9cmV0dXJuIEdpZmZmZXJ9KTsiLCJcbi8vIEZvbGxvd2luZyBjb2RlIGFkZHMgdHlwZWFoZWFkIGtleXdvcmRzIHRvIHNlYXJjaCBiYXJzXG5cbnZhciBrZXl3b3JkcyA9IG5ldyBCbG9vZGhvdW5kKHtcbiAgICBkYXR1bVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLm9iai53aGl0ZXNwYWNlKCduYW1lJyksXG4gICAgcXVlcnlUb2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy53aGl0ZXNwYWNlLFxuICAgIHByZWZldGNoOiB7XG4gICAgdXJsOiAnL2tleXdvcmRzJyxcbiAgICBmaWx0ZXI6IGZ1bmN0aW9uKGxpc3QpIHtcbiAgICAgIHJldHVybiAkLm1hcChsaXN0LCBmdW5jdGlvbihjaXR5bmFtZSkge1xuICAgICAgICByZXR1cm4geyBuYW1lOiBjaXR5bmFtZSB9OyB9KTtcbiAgICB9XG4gIH1cblxufSk7XG5cbmtleXdvcmRzLmluaXRpYWxpemUoKTtcblxuJCgnI3NlYXJjaCcpLnR5cGVhaGVhZChudWxsLCB7XG4gICAgIG1pbmxlbmd0aDogMSxcbiAgICAgbmFtZTogJ2tleXdvcmRzJyxcbiAgICAgZGlzcGxheUtleTogJ25hbWUnLFxuICAgICB2YWx1ZUtleTogJ25hbWUnLFxuICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXG59KTtcblxuJCgnI3NlYXJjaF9wYWdlJykudHlwZWFoZWFkKG51bGwsIHtcbiAgICAgbWlubGVuZ3RoOiAxLFxuICAgICBuYW1lOiAna2V5d29yZHMnLFxuICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXG4gICAgIHZhbHVlS2V5OiAnbmFtZScsXG4gICAgIHNvdXJjZToga2V5d29yZHMudHRBZGFwdGVyKClcbn0pO1xuXG5cblxuJCgnI2tleXdvcmRzJykudGFnc2lucHV0KHtcbiAgICBjb25maXJtS2V5czogWzEzLCA0NF0sXG4gICAgdHlwZWFoZWFkanM6IFt7XG4gICAgICAgICAgbWluTGVuZ3RoOiAxLFxuICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZSxcblxuICAgIH0se1xuICAgICAgICBtaW5sZW5ndGg6IDEsXG4gICAgICAgIG5hbWU6ICdrZXl3b3JkcycsXG4gICAgICAgIGRpc3BsYXlLZXk6ICduYW1lJyxcbiAgICAgICAgdmFsdWVLZXk6ICduYW1lJyxcbiAgICAgICAgc291cmNlOiBrZXl3b3Jkcy50dEFkYXB0ZXIoKVxuICAgIH1dLFxuICAgIGZyZWVJbnB1dDogdHJ1ZSxcblxufSk7XG5cbiQoJyNsb2NhdGlvbl9rZXl3b3JkcycpLnRhZ3NpbnB1dCh7XG4gICAgY29uZmlybUtleXM6IFsxMywgNDRdLFxuICAgIHR5cGVhaGVhZGpzOiBbe1xuICAgICAgICAgIG1pbkxlbmd0aDogMSxcbiAgICAgICAgICBoaWdobGlnaHQ6IHRydWUsXG5cbiAgICB9LHtcbiAgICAgICAgbWlubGVuZ3RoOiAxLFxuICAgICAgICBuYW1lOiAna2V5d29yZHMnLFxuICAgICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXG4gICAgICAgIHZhbHVlS2V5OiAnbmFtZScsXG4gICAgICAgIHNvdXJjZToga2V5d29yZHMudHRBZGFwdGVyKClcbiAgICB9XSxcbiAgICBmcmVlSW5wdXQ6IHRydWUsXG5cbn0pO1xuXG4kKCcuZHJhYWlrbm9wamUnKS5jbGljayhmdW5jdGlvbiAoKSB7XG5cdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0JCgnLmdyaWQnKS5tYXNvbnJ5KCdsYXlvdXQnKTtcblx0fSwgMTAwKTtcbn0pO1xuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gIEdpZmZmZXIoe1xuICAgICAgcGxheUJ1dHRvblN0eWxlczoge1xuICAgICAgICAnd2lkdGgnOiAnNjBweCcsXG4gICAgICAgICdoZWlnaHQnOiAnNjBweCcsXG4gICAgICAgICdib3JkZXItcmFkaXVzJzogJzMwcHgnLFxuICAgICAgICAnYmFja2dyb3VuZCc6ICdyZ2JhKDAsIDAsIDAsIDAuMyknLFxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAndG9wJzogJzUwJScsXG4gICAgICAgICdsZWZ0JzogJzUwJScsXG4gICAgICAgICdtYXJnaW4nOiAnLTMwcHggMCAwIC0zMHB4J1xuICAgICAgfSxcbiAgICAgIHBsYXlCdXR0b25JY29uU3R5bGVzOiB7XG4gICAgICAgICd3aWR0aCc6ICcwJyxcbiAgICAgICAgJ2hlaWdodCc6ICcwJyxcbiAgICAgICAgJ2JvcmRlci10b3AnOiAnMTRweCBzb2xpZCB0cmFuc3BhcmVudCcsXG4gICAgICAgICdib3JkZXItYm90dG9tJzogJzE0cHggc29saWQgdHJhbnNwYXJlbnQnLFxuICAgICAgICAnYm9yZGVyLWxlZnQnOiAnMTRweCBzb2xpZCByZ2JhKDI1NSwyNTUsMjU1LCAwLjUpJyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ2xlZnQnOiAnMjZweCcsXG4gICAgICAgICd0b3AnOiAnMTZweCdcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICQoJy5ncmlkJykubWFzb25yeSh7XG4gICAgICBpdGVtU2VsZWN0b3I6ICcuZ3JpZC1pdGVtJywgLy8gdXNlIGEgc2VwYXJhdGUgY2xhc3MgZm9yIGl0ZW1TZWxlY3Rvciwgb3RoZXIgdGhhbiAuY29sLVxuICAgICAgY29sdW1uV2lkdGg6ICcuZ3JpZC1zaXplcicsXG4gICAgICBwZXJjZW50UG9zaXRpb246IHRydWVcbiAgICB9KTtcbn1cblxuIiwiLyohXG4gKiBNYXNvbnJ5IFBBQ0tBR0VEIHY0LjIuMFxuICogQ2FzY2FkaW5nIGdyaWQgbGF5b3V0IGxpYnJhcnlcbiAqIGh0dHA6Ly9tYXNvbnJ5LmRlc2FuZHJvLmNvbVxuICogTUlUIExpY2Vuc2VcbiAqIGJ5IERhdmlkIERlU2FuZHJvXG4gKi9cblxuIWZ1bmN0aW9uKHQsZSl7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShcImpxdWVyeS1icmlkZ2V0L2pxdWVyeS1icmlkZ2V0XCIsW1wianF1ZXJ5XCJdLGZ1bmN0aW9uKGkpe3JldHVybiBlKHQsaSl9KTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKHQscmVxdWlyZShcImpxdWVyeVwiKSk6dC5qUXVlcnlCcmlkZ2V0PWUodCx0LmpRdWVyeSl9KHdpbmRvdyxmdW5jdGlvbih0LGUpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIGkoaSxyLGEpe2Z1bmN0aW9uIGgodCxlLG4pe3ZhciBvLHI9XCIkKCkuXCIraSsnKFwiJytlKydcIiknO3JldHVybiB0LmVhY2goZnVuY3Rpb24odCxoKXt2YXIgdT1hLmRhdGEoaCxpKTtpZighdSlyZXR1cm4gdm9pZCBzKGkrXCIgbm90IGluaXRpYWxpemVkLiBDYW5ub3QgY2FsbCBtZXRob2RzLCBpLmUuIFwiK3IpO3ZhciBkPXVbZV07aWYoIWR8fFwiX1wiPT1lLmNoYXJBdCgwKSlyZXR1cm4gdm9pZCBzKHIrXCIgaXMgbm90IGEgdmFsaWQgbWV0aG9kXCIpO3ZhciBsPWQuYXBwbHkodSxuKTtvPXZvaWQgMD09PW8/bDpvfSksdm9pZCAwIT09bz9vOnR9ZnVuY3Rpb24gdSh0LGUpe3QuZWFjaChmdW5jdGlvbih0LG4pe3ZhciBvPWEuZGF0YShuLGkpO28/KG8ub3B0aW9uKGUpLG8uX2luaXQoKSk6KG89bmV3IHIobixlKSxhLmRhdGEobixpLG8pKX0pfWE9YXx8ZXx8dC5qUXVlcnksYSYmKHIucHJvdG90eXBlLm9wdGlvbnx8KHIucHJvdG90eXBlLm9wdGlvbj1mdW5jdGlvbih0KXthLmlzUGxhaW5PYmplY3QodCkmJih0aGlzLm9wdGlvbnM9YS5leHRlbmQoITAsdGhpcy5vcHRpb25zLHQpKX0pLGEuZm5baV09ZnVuY3Rpb24odCl7aWYoXCJzdHJpbmdcIj09dHlwZW9mIHQpe3ZhciBlPW8uY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIGgodGhpcyx0LGUpfXJldHVybiB1KHRoaXMsdCksdGhpc30sbihhKSl9ZnVuY3Rpb24gbih0KXshdHx8dCYmdC5icmlkZ2V0fHwodC5icmlkZ2V0PWkpfXZhciBvPUFycmF5LnByb3RvdHlwZS5zbGljZSxyPXQuY29uc29sZSxzPVwidW5kZWZpbmVkXCI9PXR5cGVvZiByP2Z1bmN0aW9uKCl7fTpmdW5jdGlvbih0KXtyLmVycm9yKHQpfTtyZXR1cm4gbihlfHx0LmpRdWVyeSksaX0pLGZ1bmN0aW9uKHQsZSl7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShcImV2LWVtaXR0ZXIvZXYtZW1pdHRlclwiLGUpOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUoKTp0LkV2RW1pdHRlcj1lKCl9KFwidW5kZWZpbmVkXCIhPXR5cGVvZiB3aW5kb3c/d2luZG93OnRoaXMsZnVuY3Rpb24oKXtmdW5jdGlvbiB0KCl7fXZhciBlPXQucHJvdG90eXBlO3JldHVybiBlLm9uPWZ1bmN0aW9uKHQsZSl7aWYodCYmZSl7dmFyIGk9dGhpcy5fZXZlbnRzPXRoaXMuX2V2ZW50c3x8e30sbj1pW3RdPWlbdF18fFtdO3JldHVybi0xPT1uLmluZGV4T2YoZSkmJm4ucHVzaChlKSx0aGlzfX0sZS5vbmNlPWZ1bmN0aW9uKHQsZSl7aWYodCYmZSl7dGhpcy5vbih0LGUpO3ZhciBpPXRoaXMuX29uY2VFdmVudHM9dGhpcy5fb25jZUV2ZW50c3x8e30sbj1pW3RdPWlbdF18fHt9O3JldHVybiBuW2VdPSEwLHRoaXN9fSxlLm9mZj1mdW5jdGlvbih0LGUpe3ZhciBpPXRoaXMuX2V2ZW50cyYmdGhpcy5fZXZlbnRzW3RdO2lmKGkmJmkubGVuZ3RoKXt2YXIgbj1pLmluZGV4T2YoZSk7cmV0dXJuLTEhPW4mJmkuc3BsaWNlKG4sMSksdGhpc319LGUuZW1pdEV2ZW50PWZ1bmN0aW9uKHQsZSl7dmFyIGk9dGhpcy5fZXZlbnRzJiZ0aGlzLl9ldmVudHNbdF07aWYoaSYmaS5sZW5ndGgpe3ZhciBuPTAsbz1pW25dO2U9ZXx8W107Zm9yKHZhciByPXRoaXMuX29uY2VFdmVudHMmJnRoaXMuX29uY2VFdmVudHNbdF07bzspe3ZhciBzPXImJnJbb107cyYmKHRoaXMub2ZmKHQsbyksZGVsZXRlIHJbb10pLG8uYXBwbHkodGhpcyxlKSxuKz1zPzA6MSxvPWlbbl19cmV0dXJuIHRoaXN9fSx0fSksZnVuY3Rpb24odCxlKXtcInVzZSBzdHJpY3RcIjtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwiZ2V0LXNpemUvZ2V0LXNpemVcIixbXSxmdW5jdGlvbigpe3JldHVybiBlKCl9KTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKCk6dC5nZXRTaXplPWUoKX0od2luZG93LGZ1bmN0aW9uKCl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gdCh0KXt2YXIgZT1wYXJzZUZsb2F0KHQpLGk9LTE9PXQuaW5kZXhPZihcIiVcIikmJiFpc05hTihlKTtyZXR1cm4gaSYmZX1mdW5jdGlvbiBlKCl7fWZ1bmN0aW9uIGkoKXtmb3IodmFyIHQ9e3dpZHRoOjAsaGVpZ2h0OjAsaW5uZXJXaWR0aDowLGlubmVySGVpZ2h0OjAsb3V0ZXJXaWR0aDowLG91dGVySGVpZ2h0OjB9LGU9MDt1PmU7ZSsrKXt2YXIgaT1oW2VdO3RbaV09MH1yZXR1cm4gdH1mdW5jdGlvbiBuKHQpe3ZhciBlPWdldENvbXB1dGVkU3R5bGUodCk7cmV0dXJuIGV8fGEoXCJTdHlsZSByZXR1cm5lZCBcIitlK1wiLiBBcmUgeW91IHJ1bm5pbmcgdGhpcyBjb2RlIGluIGEgaGlkZGVuIGlmcmFtZSBvbiBGaXJlZm94PyBTZWUgaHR0cDovL2JpdC5seS9nZXRzaXplYnVnMVwiKSxlfWZ1bmN0aW9uIG8oKXtpZighZCl7ZD0hMDt2YXIgZT1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO2Uuc3R5bGUud2lkdGg9XCIyMDBweFwiLGUuc3R5bGUucGFkZGluZz1cIjFweCAycHggM3B4IDRweFwiLGUuc3R5bGUuYm9yZGVyU3R5bGU9XCJzb2xpZFwiLGUuc3R5bGUuYm9yZGVyV2lkdGg9XCIxcHggMnB4IDNweCA0cHhcIixlLnN0eWxlLmJveFNpemluZz1cImJvcmRlci1ib3hcIjt2YXIgaT1kb2N1bWVudC5ib2R5fHxkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7aS5hcHBlbmRDaGlsZChlKTt2YXIgbz1uKGUpO3IuaXNCb3hTaXplT3V0ZXI9cz0yMDA9PXQoby53aWR0aCksaS5yZW1vdmVDaGlsZChlKX19ZnVuY3Rpb24gcihlKXtpZihvKCksXCJzdHJpbmdcIj09dHlwZW9mIGUmJihlPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZSkpLGUmJlwib2JqZWN0XCI9PXR5cGVvZiBlJiZlLm5vZGVUeXBlKXt2YXIgcj1uKGUpO2lmKFwibm9uZVwiPT1yLmRpc3BsYXkpcmV0dXJuIGkoKTt2YXIgYT17fTthLndpZHRoPWUub2Zmc2V0V2lkdGgsYS5oZWlnaHQ9ZS5vZmZzZXRIZWlnaHQ7Zm9yKHZhciBkPWEuaXNCb3JkZXJCb3g9XCJib3JkZXItYm94XCI9PXIuYm94U2l6aW5nLGw9MDt1Pmw7bCsrKXt2YXIgYz1oW2xdLGY9cltjXSxtPXBhcnNlRmxvYXQoZik7YVtjXT1pc05hTihtKT8wOm19dmFyIHA9YS5wYWRkaW5nTGVmdCthLnBhZGRpbmdSaWdodCxnPWEucGFkZGluZ1RvcCthLnBhZGRpbmdCb3R0b20seT1hLm1hcmdpbkxlZnQrYS5tYXJnaW5SaWdodCx2PWEubWFyZ2luVG9wK2EubWFyZ2luQm90dG9tLF89YS5ib3JkZXJMZWZ0V2lkdGgrYS5ib3JkZXJSaWdodFdpZHRoLHo9YS5ib3JkZXJUb3BXaWR0aCthLmJvcmRlckJvdHRvbVdpZHRoLEU9ZCYmcyxiPXQoci53aWR0aCk7YiE9PSExJiYoYS53aWR0aD1iKyhFPzA6cCtfKSk7dmFyIHg9dChyLmhlaWdodCk7cmV0dXJuIHghPT0hMSYmKGEuaGVpZ2h0PXgrKEU/MDpnK3opKSxhLmlubmVyV2lkdGg9YS53aWR0aC0ocCtfKSxhLmlubmVySGVpZ2h0PWEuaGVpZ2h0LShnK3opLGEub3V0ZXJXaWR0aD1hLndpZHRoK3ksYS5vdXRlckhlaWdodD1hLmhlaWdodCt2LGF9fXZhciBzLGE9XCJ1bmRlZmluZWRcIj09dHlwZW9mIGNvbnNvbGU/ZTpmdW5jdGlvbih0KXtjb25zb2xlLmVycm9yKHQpfSxoPVtcInBhZGRpbmdMZWZ0XCIsXCJwYWRkaW5nUmlnaHRcIixcInBhZGRpbmdUb3BcIixcInBhZGRpbmdCb3R0b21cIixcIm1hcmdpbkxlZnRcIixcIm1hcmdpblJpZ2h0XCIsXCJtYXJnaW5Ub3BcIixcIm1hcmdpbkJvdHRvbVwiLFwiYm9yZGVyTGVmdFdpZHRoXCIsXCJib3JkZXJSaWdodFdpZHRoXCIsXCJib3JkZXJUb3BXaWR0aFwiLFwiYm9yZGVyQm90dG9tV2lkdGhcIl0sdT1oLmxlbmd0aCxkPSExO3JldHVybiByfSksZnVuY3Rpb24odCxlKXtcInVzZSBzdHJpY3RcIjtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwiZGVzYW5kcm8tbWF0Y2hlcy1zZWxlY3Rvci9tYXRjaGVzLXNlbGVjdG9yXCIsZSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZSgpOnQubWF0Y2hlc1NlbGVjdG9yPWUoKX0od2luZG93LGZ1bmN0aW9uKCl7XCJ1c2Ugc3RyaWN0XCI7dmFyIHQ9ZnVuY3Rpb24oKXt2YXIgdD13aW5kb3cuRWxlbWVudC5wcm90b3R5cGU7aWYodC5tYXRjaGVzKXJldHVyblwibWF0Y2hlc1wiO2lmKHQubWF0Y2hlc1NlbGVjdG9yKXJldHVyblwibWF0Y2hlc1NlbGVjdG9yXCI7Zm9yKHZhciBlPVtcIndlYmtpdFwiLFwibW96XCIsXCJtc1wiLFwib1wiXSxpPTA7aTxlLmxlbmd0aDtpKyspe3ZhciBuPWVbaV0sbz1uK1wiTWF0Y2hlc1NlbGVjdG9yXCI7aWYodFtvXSlyZXR1cm4gb319KCk7cmV0dXJuIGZ1bmN0aW9uKGUsaSl7cmV0dXJuIGVbdF0oaSl9fSksZnVuY3Rpb24odCxlKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwiZml6enktdWktdXRpbHMvdXRpbHNcIixbXCJkZXNhbmRyby1tYXRjaGVzLXNlbGVjdG9yL21hdGNoZXMtc2VsZWN0b3JcIl0sZnVuY3Rpb24oaSl7cmV0dXJuIGUodCxpKX0pOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUodCxyZXF1aXJlKFwiZGVzYW5kcm8tbWF0Y2hlcy1zZWxlY3RvclwiKSk6dC5maXp6eVVJVXRpbHM9ZSh0LHQubWF0Y2hlc1NlbGVjdG9yKX0od2luZG93LGZ1bmN0aW9uKHQsZSl7dmFyIGk9e307aS5leHRlbmQ9ZnVuY3Rpb24odCxlKXtmb3IodmFyIGkgaW4gZSl0W2ldPWVbaV07cmV0dXJuIHR9LGkubW9kdWxvPWZ1bmN0aW9uKHQsZSl7cmV0dXJuKHQlZStlKSVlfSxpLm1ha2VBcnJheT1mdW5jdGlvbih0KXt2YXIgZT1bXTtpZihBcnJheS5pc0FycmF5KHQpKWU9dDtlbHNlIGlmKHQmJlwib2JqZWN0XCI9PXR5cGVvZiB0JiZcIm51bWJlclwiPT10eXBlb2YgdC5sZW5ndGgpZm9yKHZhciBpPTA7aTx0Lmxlbmd0aDtpKyspZS5wdXNoKHRbaV0pO2Vsc2UgZS5wdXNoKHQpO3JldHVybiBlfSxpLnJlbW92ZUZyb209ZnVuY3Rpb24odCxlKXt2YXIgaT10LmluZGV4T2YoZSk7LTEhPWkmJnQuc3BsaWNlKGksMSl9LGkuZ2V0UGFyZW50PWZ1bmN0aW9uKHQsaSl7Zm9yKDt0IT1kb2N1bWVudC5ib2R5OylpZih0PXQucGFyZW50Tm9kZSxlKHQsaSkpcmV0dXJuIHR9LGkuZ2V0UXVlcnlFbGVtZW50PWZ1bmN0aW9uKHQpe3JldHVyblwic3RyaW5nXCI9PXR5cGVvZiB0P2RvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodCk6dH0saS5oYW5kbGVFdmVudD1mdW5jdGlvbih0KXt2YXIgZT1cIm9uXCIrdC50eXBlO3RoaXNbZV0mJnRoaXNbZV0odCl9LGkuZmlsdGVyRmluZEVsZW1lbnRzPWZ1bmN0aW9uKHQsbil7dD1pLm1ha2VBcnJheSh0KTt2YXIgbz1bXTtyZXR1cm4gdC5mb3JFYWNoKGZ1bmN0aW9uKHQpe2lmKHQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCl7aWYoIW4pcmV0dXJuIHZvaWQgby5wdXNoKHQpO2UodCxuKSYmby5wdXNoKHQpO2Zvcih2YXIgaT10LnF1ZXJ5U2VsZWN0b3JBbGwobikscj0wO3I8aS5sZW5ndGg7cisrKW8ucHVzaChpW3JdKX19KSxvfSxpLmRlYm91bmNlTWV0aG9kPWZ1bmN0aW9uKHQsZSxpKXt2YXIgbj10LnByb3RvdHlwZVtlXSxvPWUrXCJUaW1lb3V0XCI7dC5wcm90b3R5cGVbZV09ZnVuY3Rpb24oKXt2YXIgdD10aGlzW29dO3QmJmNsZWFyVGltZW91dCh0KTt2YXIgZT1hcmd1bWVudHMscj10aGlzO3RoaXNbb109c2V0VGltZW91dChmdW5jdGlvbigpe24uYXBwbHkocixlKSxkZWxldGUgcltvXX0saXx8MTAwKX19LGkuZG9jUmVhZHk9ZnVuY3Rpb24odCl7dmFyIGU9ZG9jdW1lbnQucmVhZHlTdGF0ZTtcImNvbXBsZXRlXCI9PWV8fFwiaW50ZXJhY3RpdmVcIj09ZT9zZXRUaW1lb3V0KHQpOmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsdCl9LGkudG9EYXNoZWQ9ZnVuY3Rpb24odCl7cmV0dXJuIHQucmVwbGFjZSgvKC4pKFtBLVpdKS9nLGZ1bmN0aW9uKHQsZSxpKXtyZXR1cm4gZStcIi1cIitpfSkudG9Mb3dlckNhc2UoKX07dmFyIG49dC5jb25zb2xlO3JldHVybiBpLmh0bWxJbml0PWZ1bmN0aW9uKGUsbyl7aS5kb2NSZWFkeShmdW5jdGlvbigpe3ZhciByPWkudG9EYXNoZWQobykscz1cImRhdGEtXCIrcixhPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJbXCIrcytcIl1cIiksaD1kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLmpzLVwiK3IpLHU9aS5tYWtlQXJyYXkoYSkuY29uY2F0KGkubWFrZUFycmF5KGgpKSxkPXMrXCItb3B0aW9uc1wiLGw9dC5qUXVlcnk7dS5mb3JFYWNoKGZ1bmN0aW9uKHQpe3ZhciBpLHI9dC5nZXRBdHRyaWJ1dGUocyl8fHQuZ2V0QXR0cmlidXRlKGQpO3RyeXtpPXImJkpTT04ucGFyc2Uocil9Y2F0Y2goYSl7cmV0dXJuIHZvaWQobiYmbi5lcnJvcihcIkVycm9yIHBhcnNpbmcgXCIrcytcIiBvbiBcIit0LmNsYXNzTmFtZStcIjogXCIrYSkpfXZhciBoPW5ldyBlKHQsaSk7bCYmbC5kYXRhKHQsbyxoKX0pfSl9LGl9KSxmdW5jdGlvbih0LGUpe1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJvdXRsYXllci9pdGVtXCIsW1wiZXYtZW1pdHRlci9ldi1lbWl0dGVyXCIsXCJnZXQtc2l6ZS9nZXQtc2l6ZVwiXSxlKTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKHJlcXVpcmUoXCJldi1lbWl0dGVyXCIpLHJlcXVpcmUoXCJnZXQtc2l6ZVwiKSk6KHQuT3V0bGF5ZXI9e30sdC5PdXRsYXllci5JdGVtPWUodC5FdkVtaXR0ZXIsdC5nZXRTaXplKSl9KHdpbmRvdyxmdW5jdGlvbih0LGUpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIGkodCl7Zm9yKHZhciBlIGluIHQpcmV0dXJuITE7cmV0dXJuIGU9bnVsbCwhMH1mdW5jdGlvbiBuKHQsZSl7dCYmKHRoaXMuZWxlbWVudD10LHRoaXMubGF5b3V0PWUsdGhpcy5wb3NpdGlvbj17eDowLHk6MH0sdGhpcy5fY3JlYXRlKCkpfWZ1bmN0aW9uIG8odCl7cmV0dXJuIHQucmVwbGFjZSgvKFtBLVpdKS9nLGZ1bmN0aW9uKHQpe3JldHVyblwiLVwiK3QudG9Mb3dlckNhc2UoKX0pfXZhciByPWRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZSxzPVwic3RyaW5nXCI9PXR5cGVvZiByLnRyYW5zaXRpb24/XCJ0cmFuc2l0aW9uXCI6XCJXZWJraXRUcmFuc2l0aW9uXCIsYT1cInN0cmluZ1wiPT10eXBlb2Ygci50cmFuc2Zvcm0/XCJ0cmFuc2Zvcm1cIjpcIldlYmtpdFRyYW5zZm9ybVwiLGg9e1dlYmtpdFRyYW5zaXRpb246XCJ3ZWJraXRUcmFuc2l0aW9uRW5kXCIsdHJhbnNpdGlvbjpcInRyYW5zaXRpb25lbmRcIn1bc10sdT17dHJhbnNmb3JtOmEsdHJhbnNpdGlvbjpzLHRyYW5zaXRpb25EdXJhdGlvbjpzK1wiRHVyYXRpb25cIix0cmFuc2l0aW9uUHJvcGVydHk6cytcIlByb3BlcnR5XCIsdHJhbnNpdGlvbkRlbGF5OnMrXCJEZWxheVwifSxkPW4ucHJvdG90eXBlPU9iamVjdC5jcmVhdGUodC5wcm90b3R5cGUpO2QuY29uc3RydWN0b3I9bixkLl9jcmVhdGU9ZnVuY3Rpb24oKXt0aGlzLl90cmFuc249e2luZ1Byb3BlcnRpZXM6e30sY2xlYW46e30sb25FbmQ6e319LHRoaXMuY3NzKHtwb3NpdGlvbjpcImFic29sdXRlXCJ9KX0sZC5oYW5kbGVFdmVudD1mdW5jdGlvbih0KXt2YXIgZT1cIm9uXCIrdC50eXBlO3RoaXNbZV0mJnRoaXNbZV0odCl9LGQuZ2V0U2l6ZT1mdW5jdGlvbigpe3RoaXMuc2l6ZT1lKHRoaXMuZWxlbWVudCl9LGQuY3NzPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZWxlbWVudC5zdHlsZTtmb3IodmFyIGkgaW4gdCl7dmFyIG49dVtpXXx8aTtlW25dPXRbaV19fSxkLmdldFBvc2l0aW9uPWZ1bmN0aW9uKCl7dmFyIHQ9Z2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmVsZW1lbnQpLGU9dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcIm9yaWdpbkxlZnRcIiksaT10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luVG9wXCIpLG49dFtlP1wibGVmdFwiOlwicmlnaHRcIl0sbz10W2k/XCJ0b3BcIjpcImJvdHRvbVwiXSxyPXRoaXMubGF5b3V0LnNpemUscz0tMSE9bi5pbmRleE9mKFwiJVwiKT9wYXJzZUZsb2F0KG4pLzEwMCpyLndpZHRoOnBhcnNlSW50KG4sMTApLGE9LTEhPW8uaW5kZXhPZihcIiVcIik/cGFyc2VGbG9hdChvKS8xMDAqci5oZWlnaHQ6cGFyc2VJbnQobywxMCk7cz1pc05hTihzKT8wOnMsYT1pc05hTihhKT8wOmEscy09ZT9yLnBhZGRpbmdMZWZ0OnIucGFkZGluZ1JpZ2h0LGEtPWk/ci5wYWRkaW5nVG9wOnIucGFkZGluZ0JvdHRvbSx0aGlzLnBvc2l0aW9uLng9cyx0aGlzLnBvc2l0aW9uLnk9YX0sZC5sYXlvdXRQb3NpdGlvbj1mdW5jdGlvbigpe3ZhciB0PXRoaXMubGF5b3V0LnNpemUsZT17fSxpPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJvcmlnaW5MZWZ0XCIpLG49dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcIm9yaWdpblRvcFwiKSxvPWk/XCJwYWRkaW5nTGVmdFwiOlwicGFkZGluZ1JpZ2h0XCIscj1pP1wibGVmdFwiOlwicmlnaHRcIixzPWk/XCJyaWdodFwiOlwibGVmdFwiLGE9dGhpcy5wb3NpdGlvbi54K3Rbb107ZVtyXT10aGlzLmdldFhWYWx1ZShhKSxlW3NdPVwiXCI7dmFyIGg9bj9cInBhZGRpbmdUb3BcIjpcInBhZGRpbmdCb3R0b21cIix1PW4/XCJ0b3BcIjpcImJvdHRvbVwiLGQ9bj9cImJvdHRvbVwiOlwidG9wXCIsbD10aGlzLnBvc2l0aW9uLnkrdFtoXTtlW3VdPXRoaXMuZ2V0WVZhbHVlKGwpLGVbZF09XCJcIix0aGlzLmNzcyhlKSx0aGlzLmVtaXRFdmVudChcImxheW91dFwiLFt0aGlzXSl9LGQuZ2V0WFZhbHVlPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJob3Jpem9udGFsXCIpO3JldHVybiB0aGlzLmxheW91dC5vcHRpb25zLnBlcmNlbnRQb3NpdGlvbiYmIWU/dC90aGlzLmxheW91dC5zaXplLndpZHRoKjEwMCtcIiVcIjp0K1wicHhcIn0sZC5nZXRZVmFsdWU9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcImhvcml6b250YWxcIik7cmV0dXJuIHRoaXMubGF5b3V0Lm9wdGlvbnMucGVyY2VudFBvc2l0aW9uJiZlP3QvdGhpcy5sYXlvdXQuc2l6ZS5oZWlnaHQqMTAwK1wiJVwiOnQrXCJweFwifSxkLl90cmFuc2l0aW9uVG89ZnVuY3Rpb24odCxlKXt0aGlzLmdldFBvc2l0aW9uKCk7dmFyIGk9dGhpcy5wb3NpdGlvbi54LG49dGhpcy5wb3NpdGlvbi55LG89cGFyc2VJbnQodCwxMCkscj1wYXJzZUludChlLDEwKSxzPW89PT10aGlzLnBvc2l0aW9uLngmJnI9PT10aGlzLnBvc2l0aW9uLnk7aWYodGhpcy5zZXRQb3NpdGlvbih0LGUpLHMmJiF0aGlzLmlzVHJhbnNpdGlvbmluZylyZXR1cm4gdm9pZCB0aGlzLmxheW91dFBvc2l0aW9uKCk7dmFyIGE9dC1pLGg9ZS1uLHU9e307dS50cmFuc2Zvcm09dGhpcy5nZXRUcmFuc2xhdGUoYSxoKSx0aGlzLnRyYW5zaXRpb24oe3RvOnUsb25UcmFuc2l0aW9uRW5kOnt0cmFuc2Zvcm06dGhpcy5sYXlvdXRQb3NpdGlvbn0saXNDbGVhbmluZzohMH0pfSxkLmdldFRyYW5zbGF0ZT1mdW5jdGlvbih0LGUpe3ZhciBpPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJvcmlnaW5MZWZ0XCIpLG49dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcIm9yaWdpblRvcFwiKTtyZXR1cm4gdD1pP3Q6LXQsZT1uP2U6LWUsXCJ0cmFuc2xhdGUzZChcIit0K1wicHgsIFwiK2UrXCJweCwgMClcIn0sZC5nb1RvPWZ1bmN0aW9uKHQsZSl7dGhpcy5zZXRQb3NpdGlvbih0LGUpLHRoaXMubGF5b3V0UG9zaXRpb24oKX0sZC5tb3ZlVG89ZC5fdHJhbnNpdGlvblRvLGQuc2V0UG9zaXRpb249ZnVuY3Rpb24odCxlKXt0aGlzLnBvc2l0aW9uLng9cGFyc2VJbnQodCwxMCksdGhpcy5wb3NpdGlvbi55PXBhcnNlSW50KGUsMTApfSxkLl9ub25UcmFuc2l0aW9uPWZ1bmN0aW9uKHQpe3RoaXMuY3NzKHQudG8pLHQuaXNDbGVhbmluZyYmdGhpcy5fcmVtb3ZlU3R5bGVzKHQudG8pO2Zvcih2YXIgZSBpbiB0Lm9uVHJhbnNpdGlvbkVuZCl0Lm9uVHJhbnNpdGlvbkVuZFtlXS5jYWxsKHRoaXMpfSxkLnRyYW5zaXRpb249ZnVuY3Rpb24odCl7aWYoIXBhcnNlRmxvYXQodGhpcy5sYXlvdXQub3B0aW9ucy50cmFuc2l0aW9uRHVyYXRpb24pKXJldHVybiB2b2lkIHRoaXMuX25vblRyYW5zaXRpb24odCk7dmFyIGU9dGhpcy5fdHJhbnNuO2Zvcih2YXIgaSBpbiB0Lm9uVHJhbnNpdGlvbkVuZCllLm9uRW5kW2ldPXQub25UcmFuc2l0aW9uRW5kW2ldO2ZvcihpIGluIHQudG8pZS5pbmdQcm9wZXJ0aWVzW2ldPSEwLHQuaXNDbGVhbmluZyYmKGUuY2xlYW5baV09ITApO2lmKHQuZnJvbSl7dGhpcy5jc3ModC5mcm9tKTt2YXIgbj10aGlzLmVsZW1lbnQub2Zmc2V0SGVpZ2h0O249bnVsbH10aGlzLmVuYWJsZVRyYW5zaXRpb24odC50byksdGhpcy5jc3ModC50byksdGhpcy5pc1RyYW5zaXRpb25pbmc9ITB9O3ZhciBsPVwib3BhY2l0eSxcIitvKGEpO2QuZW5hYmxlVHJhbnNpdGlvbj1mdW5jdGlvbigpe2lmKCF0aGlzLmlzVHJhbnNpdGlvbmluZyl7dmFyIHQ9dGhpcy5sYXlvdXQub3B0aW9ucy50cmFuc2l0aW9uRHVyYXRpb247dD1cIm51bWJlclwiPT10eXBlb2YgdD90K1wibXNcIjp0LHRoaXMuY3NzKHt0cmFuc2l0aW9uUHJvcGVydHk6bCx0cmFuc2l0aW9uRHVyYXRpb246dCx0cmFuc2l0aW9uRGVsYXk6dGhpcy5zdGFnZ2VyRGVsYXl8fDB9KSx0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihoLHRoaXMsITEpfX0sZC5vbndlYmtpdFRyYW5zaXRpb25FbmQ9ZnVuY3Rpb24odCl7dGhpcy5vbnRyYW5zaXRpb25lbmQodCl9LGQub25vdHJhbnNpdGlvbmVuZD1mdW5jdGlvbih0KXt0aGlzLm9udHJhbnNpdGlvbmVuZCh0KX07dmFyIGM9e1wiLXdlYmtpdC10cmFuc2Zvcm1cIjpcInRyYW5zZm9ybVwifTtkLm9udHJhbnNpdGlvbmVuZD1mdW5jdGlvbih0KXtpZih0LnRhcmdldD09PXRoaXMuZWxlbWVudCl7dmFyIGU9dGhpcy5fdHJhbnNuLG49Y1t0LnByb3BlcnR5TmFtZV18fHQucHJvcGVydHlOYW1lO2lmKGRlbGV0ZSBlLmluZ1Byb3BlcnRpZXNbbl0saShlLmluZ1Byb3BlcnRpZXMpJiZ0aGlzLmRpc2FibGVUcmFuc2l0aW9uKCksbiBpbiBlLmNsZWFuJiYodGhpcy5lbGVtZW50LnN0eWxlW3QucHJvcGVydHlOYW1lXT1cIlwiLGRlbGV0ZSBlLmNsZWFuW25dKSxuIGluIGUub25FbmQpe3ZhciBvPWUub25FbmRbbl07by5jYWxsKHRoaXMpLGRlbGV0ZSBlLm9uRW5kW25dfXRoaXMuZW1pdEV2ZW50KFwidHJhbnNpdGlvbkVuZFwiLFt0aGlzXSl9fSxkLmRpc2FibGVUcmFuc2l0aW9uPWZ1bmN0aW9uKCl7dGhpcy5yZW1vdmVUcmFuc2l0aW9uU3R5bGVzKCksdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoaCx0aGlzLCExKSx0aGlzLmlzVHJhbnNpdGlvbmluZz0hMX0sZC5fcmVtb3ZlU3R5bGVzPWZ1bmN0aW9uKHQpe3ZhciBlPXt9O2Zvcih2YXIgaSBpbiB0KWVbaV09XCJcIjt0aGlzLmNzcyhlKX07dmFyIGY9e3RyYW5zaXRpb25Qcm9wZXJ0eTpcIlwiLHRyYW5zaXRpb25EdXJhdGlvbjpcIlwiLHRyYW5zaXRpb25EZWxheTpcIlwifTtyZXR1cm4gZC5yZW1vdmVUcmFuc2l0aW9uU3R5bGVzPWZ1bmN0aW9uKCl7dGhpcy5jc3MoZil9LGQuc3RhZ2dlcj1mdW5jdGlvbih0KXt0PWlzTmFOKHQpPzA6dCx0aGlzLnN0YWdnZXJEZWxheT10K1wibXNcIn0sZC5yZW1vdmVFbGVtPWZ1bmN0aW9uKCl7dGhpcy5lbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50KSx0aGlzLmNzcyh7ZGlzcGxheTpcIlwifSksdGhpcy5lbWl0RXZlbnQoXCJyZW1vdmVcIixbdGhpc10pfSxkLnJlbW92ZT1mdW5jdGlvbigpe3JldHVybiBzJiZwYXJzZUZsb2F0KHRoaXMubGF5b3V0Lm9wdGlvbnMudHJhbnNpdGlvbkR1cmF0aW9uKT8odGhpcy5vbmNlKFwidHJhbnNpdGlvbkVuZFwiLGZ1bmN0aW9uKCl7dGhpcy5yZW1vdmVFbGVtKCl9KSx2b2lkIHRoaXMuaGlkZSgpKTp2b2lkIHRoaXMucmVtb3ZlRWxlbSgpfSxkLnJldmVhbD1mdW5jdGlvbigpe2RlbGV0ZSB0aGlzLmlzSGlkZGVuLHRoaXMuY3NzKHtkaXNwbGF5OlwiXCJ9KTt2YXIgdD10aGlzLmxheW91dC5vcHRpb25zLGU9e30saT10aGlzLmdldEhpZGVSZXZlYWxUcmFuc2l0aW9uRW5kUHJvcGVydHkoXCJ2aXNpYmxlU3R5bGVcIik7ZVtpXT10aGlzLm9uUmV2ZWFsVHJhbnNpdGlvbkVuZCx0aGlzLnRyYW5zaXRpb24oe2Zyb206dC5oaWRkZW5TdHlsZSx0bzp0LnZpc2libGVTdHlsZSxpc0NsZWFuaW5nOiEwLG9uVHJhbnNpdGlvbkVuZDplfSl9LGQub25SZXZlYWxUcmFuc2l0aW9uRW5kPWZ1bmN0aW9uKCl7dGhpcy5pc0hpZGRlbnx8dGhpcy5lbWl0RXZlbnQoXCJyZXZlYWxcIil9LGQuZ2V0SGlkZVJldmVhbFRyYW5zaXRpb25FbmRQcm9wZXJ0eT1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmxheW91dC5vcHRpb25zW3RdO2lmKGUub3BhY2l0eSlyZXR1cm5cIm9wYWNpdHlcIjtmb3IodmFyIGkgaW4gZSlyZXR1cm4gaX0sZC5oaWRlPWZ1bmN0aW9uKCl7dGhpcy5pc0hpZGRlbj0hMCx0aGlzLmNzcyh7ZGlzcGxheTpcIlwifSk7dmFyIHQ9dGhpcy5sYXlvdXQub3B0aW9ucyxlPXt9LGk9dGhpcy5nZXRIaWRlUmV2ZWFsVHJhbnNpdGlvbkVuZFByb3BlcnR5KFwiaGlkZGVuU3R5bGVcIik7ZVtpXT10aGlzLm9uSGlkZVRyYW5zaXRpb25FbmQsdGhpcy50cmFuc2l0aW9uKHtmcm9tOnQudmlzaWJsZVN0eWxlLHRvOnQuaGlkZGVuU3R5bGUsaXNDbGVhbmluZzohMCxvblRyYW5zaXRpb25FbmQ6ZX0pfSxkLm9uSGlkZVRyYW5zaXRpb25FbmQ9ZnVuY3Rpb24oKXt0aGlzLmlzSGlkZGVuJiYodGhpcy5jc3Moe2Rpc3BsYXk6XCJub25lXCJ9KSx0aGlzLmVtaXRFdmVudChcImhpZGVcIikpfSxkLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLmNzcyh7cG9zaXRpb246XCJcIixsZWZ0OlwiXCIscmlnaHQ6XCJcIix0b3A6XCJcIixib3R0b206XCJcIix0cmFuc2l0aW9uOlwiXCIsdHJhbnNmb3JtOlwiXCJ9KX0sbn0pLGZ1bmN0aW9uKHQsZSl7XCJ1c2Ugc3RyaWN0XCI7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShcIm91dGxheWVyL291dGxheWVyXCIsW1wiZXYtZW1pdHRlci9ldi1lbWl0dGVyXCIsXCJnZXQtc2l6ZS9nZXQtc2l6ZVwiLFwiZml6enktdWktdXRpbHMvdXRpbHNcIixcIi4vaXRlbVwiXSxmdW5jdGlvbihpLG4sbyxyKXtyZXR1cm4gZSh0LGksbixvLHIpfSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZSh0LHJlcXVpcmUoXCJldi1lbWl0dGVyXCIpLHJlcXVpcmUoXCJnZXQtc2l6ZVwiKSxyZXF1aXJlKFwiZml6enktdWktdXRpbHNcIikscmVxdWlyZShcIi4vaXRlbVwiKSk6dC5PdXRsYXllcj1lKHQsdC5FdkVtaXR0ZXIsdC5nZXRTaXplLHQuZml6enlVSVV0aWxzLHQuT3V0bGF5ZXIuSXRlbSl9KHdpbmRvdyxmdW5jdGlvbih0LGUsaSxuLG8pe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIHIodCxlKXt2YXIgaT1uLmdldFF1ZXJ5RWxlbWVudCh0KTtpZighaSlyZXR1cm4gdm9pZChoJiZoLmVycm9yKFwiQmFkIGVsZW1lbnQgZm9yIFwiK3RoaXMuY29uc3RydWN0b3IubmFtZXNwYWNlK1wiOiBcIisoaXx8dCkpKTt0aGlzLmVsZW1lbnQ9aSx1JiYodGhpcy4kZWxlbWVudD11KHRoaXMuZWxlbWVudCkpLHRoaXMub3B0aW9ucz1uLmV4dGVuZCh7fSx0aGlzLmNvbnN0cnVjdG9yLmRlZmF1bHRzKSx0aGlzLm9wdGlvbihlKTt2YXIgbz0rK2w7dGhpcy5lbGVtZW50Lm91dGxheWVyR1VJRD1vLGNbb109dGhpcyx0aGlzLl9jcmVhdGUoKTt2YXIgcj10aGlzLl9nZXRPcHRpb24oXCJpbml0TGF5b3V0XCIpO3ImJnRoaXMubGF5b3V0KCl9ZnVuY3Rpb24gcyh0KXtmdW5jdGlvbiBlKCl7dC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9cmV0dXJuIGUucHJvdG90eXBlPU9iamVjdC5jcmVhdGUodC5wcm90b3R5cGUpLGUucHJvdG90eXBlLmNvbnN0cnVjdG9yPWUsZX1mdW5jdGlvbiBhKHQpe2lmKFwibnVtYmVyXCI9PXR5cGVvZiB0KXJldHVybiB0O3ZhciBlPXQubWF0Y2goLyheXFxkKlxcLj9cXGQqKShcXHcqKS8pLGk9ZSYmZVsxXSxuPWUmJmVbMl07aWYoIWkubGVuZ3RoKXJldHVybiAwO2k9cGFyc2VGbG9hdChpKTt2YXIgbz1tW25dfHwxO3JldHVybiBpKm99dmFyIGg9dC5jb25zb2xlLHU9dC5qUXVlcnksZD1mdW5jdGlvbigpe30sbD0wLGM9e307ci5uYW1lc3BhY2U9XCJvdXRsYXllclwiLHIuSXRlbT1vLHIuZGVmYXVsdHM9e2NvbnRhaW5lclN0eWxlOntwb3NpdGlvbjpcInJlbGF0aXZlXCJ9LGluaXRMYXlvdXQ6ITAsb3JpZ2luTGVmdDohMCxvcmlnaW5Ub3A6ITAscmVzaXplOiEwLHJlc2l6ZUNvbnRhaW5lcjohMCx0cmFuc2l0aW9uRHVyYXRpb246XCIwLjRzXCIsaGlkZGVuU3R5bGU6e29wYWNpdHk6MCx0cmFuc2Zvcm06XCJzY2FsZSgwLjAwMSlcIn0sdmlzaWJsZVN0eWxlOntvcGFjaXR5OjEsdHJhbnNmb3JtOlwic2NhbGUoMSlcIn19O3ZhciBmPXIucHJvdG90eXBlO24uZXh0ZW5kKGYsZS5wcm90b3R5cGUpLGYub3B0aW9uPWZ1bmN0aW9uKHQpe24uZXh0ZW5kKHRoaXMub3B0aW9ucyx0KX0sZi5fZ2V0T3B0aW9uPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuY29uc3RydWN0b3IuY29tcGF0T3B0aW9uc1t0XTtyZXR1cm4gZSYmdm9pZCAwIT09dGhpcy5vcHRpb25zW2VdP3RoaXMub3B0aW9uc1tlXTp0aGlzLm9wdGlvbnNbdF19LHIuY29tcGF0T3B0aW9ucz17aW5pdExheW91dDpcImlzSW5pdExheW91dFwiLGhvcml6b250YWw6XCJpc0hvcml6b250YWxcIixsYXlvdXRJbnN0YW50OlwiaXNMYXlvdXRJbnN0YW50XCIsb3JpZ2luTGVmdDpcImlzT3JpZ2luTGVmdFwiLG9yaWdpblRvcDpcImlzT3JpZ2luVG9wXCIscmVzaXplOlwiaXNSZXNpemVCb3VuZFwiLHJlc2l6ZUNvbnRhaW5lcjpcImlzUmVzaXppbmdDb250YWluZXJcIn0sZi5fY3JlYXRlPWZ1bmN0aW9uKCl7dGhpcy5yZWxvYWRJdGVtcygpLHRoaXMuc3RhbXBzPVtdLHRoaXMuc3RhbXAodGhpcy5vcHRpb25zLnN0YW1wKSxuLmV4dGVuZCh0aGlzLmVsZW1lbnQuc3R5bGUsdGhpcy5vcHRpb25zLmNvbnRhaW5lclN0eWxlKTt2YXIgdD10aGlzLl9nZXRPcHRpb24oXCJyZXNpemVcIik7dCYmdGhpcy5iaW5kUmVzaXplKCl9LGYucmVsb2FkSXRlbXM9ZnVuY3Rpb24oKXt0aGlzLml0ZW1zPXRoaXMuX2l0ZW1pemUodGhpcy5lbGVtZW50LmNoaWxkcmVuKX0sZi5faXRlbWl6ZT1mdW5jdGlvbih0KXtmb3IodmFyIGU9dGhpcy5fZmlsdGVyRmluZEl0ZW1FbGVtZW50cyh0KSxpPXRoaXMuY29uc3RydWN0b3IuSXRlbSxuPVtdLG89MDtvPGUubGVuZ3RoO28rKyl7dmFyIHI9ZVtvXSxzPW5ldyBpKHIsdGhpcyk7bi5wdXNoKHMpfXJldHVybiBufSxmLl9maWx0ZXJGaW5kSXRlbUVsZW1lbnRzPWZ1bmN0aW9uKHQpe3JldHVybiBuLmZpbHRlckZpbmRFbGVtZW50cyh0LHRoaXMub3B0aW9ucy5pdGVtU2VsZWN0b3IpfSxmLmdldEl0ZW1FbGVtZW50cz1mdW5jdGlvbigpe3JldHVybiB0aGlzLml0ZW1zLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdC5lbGVtZW50fSl9LGYubGF5b3V0PWZ1bmN0aW9uKCl7dGhpcy5fcmVzZXRMYXlvdXQoKSx0aGlzLl9tYW5hZ2VTdGFtcHMoKTt2YXIgdD10aGlzLl9nZXRPcHRpb24oXCJsYXlvdXRJbnN0YW50XCIpLGU9dm9pZCAwIT09dD90OiF0aGlzLl9pc0xheW91dEluaXRlZDt0aGlzLmxheW91dEl0ZW1zKHRoaXMuaXRlbXMsZSksdGhpcy5faXNMYXlvdXRJbml0ZWQ9ITB9LGYuX2luaXQ9Zi5sYXlvdXQsZi5fcmVzZXRMYXlvdXQ9ZnVuY3Rpb24oKXt0aGlzLmdldFNpemUoKX0sZi5nZXRTaXplPWZ1bmN0aW9uKCl7dGhpcy5zaXplPWkodGhpcy5lbGVtZW50KX0sZi5fZ2V0TWVhc3VyZW1lbnQ9ZnVuY3Rpb24odCxlKXt2YXIgbixvPXRoaXMub3B0aW9uc1t0XTtvPyhcInN0cmluZ1wiPT10eXBlb2Ygbz9uPXRoaXMuZWxlbWVudC5xdWVyeVNlbGVjdG9yKG8pOm8gaW5zdGFuY2VvZiBIVE1MRWxlbWVudCYmKG49byksdGhpc1t0XT1uP2kobilbZV06byk6dGhpc1t0XT0wfSxmLmxheW91dEl0ZW1zPWZ1bmN0aW9uKHQsZSl7dD10aGlzLl9nZXRJdGVtc0ZvckxheW91dCh0KSx0aGlzLl9sYXlvdXRJdGVtcyh0LGUpLHRoaXMuX3Bvc3RMYXlvdXQoKX0sZi5fZ2V0SXRlbXNGb3JMYXlvdXQ9ZnVuY3Rpb24odCl7cmV0dXJuIHQuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiF0LmlzSWdub3JlZH0pfSxmLl9sYXlvdXRJdGVtcz1mdW5jdGlvbih0LGUpe2lmKHRoaXMuX2VtaXRDb21wbGV0ZU9uSXRlbXMoXCJsYXlvdXRcIix0KSx0JiZ0Lmxlbmd0aCl7dmFyIGk9W107dC5mb3JFYWNoKGZ1bmN0aW9uKHQpe3ZhciBuPXRoaXMuX2dldEl0ZW1MYXlvdXRQb3NpdGlvbih0KTtuLml0ZW09dCxuLmlzSW5zdGFudD1lfHx0LmlzTGF5b3V0SW5zdGFudCxpLnB1c2gobil9LHRoaXMpLHRoaXMuX3Byb2Nlc3NMYXlvdXRRdWV1ZShpKX19LGYuX2dldEl0ZW1MYXlvdXRQb3NpdGlvbj1mdW5jdGlvbigpe3JldHVybnt4OjAseTowfX0sZi5fcHJvY2Vzc0xheW91dFF1ZXVlPWZ1bmN0aW9uKHQpe3RoaXMudXBkYXRlU3RhZ2dlcigpLHQuZm9yRWFjaChmdW5jdGlvbih0LGUpe3RoaXMuX3Bvc2l0aW9uSXRlbSh0Lml0ZW0sdC54LHQueSx0LmlzSW5zdGFudCxlKX0sdGhpcyl9LGYudXBkYXRlU3RhZ2dlcj1mdW5jdGlvbigpe3ZhciB0PXRoaXMub3B0aW9ucy5zdGFnZ2VyO3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD92b2lkKHRoaXMuc3RhZ2dlcj0wKToodGhpcy5zdGFnZ2VyPWEodCksdGhpcy5zdGFnZ2VyKX0sZi5fcG9zaXRpb25JdGVtPWZ1bmN0aW9uKHQsZSxpLG4sbyl7bj90LmdvVG8oZSxpKToodC5zdGFnZ2VyKG8qdGhpcy5zdGFnZ2VyKSx0Lm1vdmVUbyhlLGkpKX0sZi5fcG9zdExheW91dD1mdW5jdGlvbigpe3RoaXMucmVzaXplQ29udGFpbmVyKCl9LGYucmVzaXplQ29udGFpbmVyPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fZ2V0T3B0aW9uKFwicmVzaXplQ29udGFpbmVyXCIpO2lmKHQpe3ZhciBlPXRoaXMuX2dldENvbnRhaW5lclNpemUoKTtlJiYodGhpcy5fc2V0Q29udGFpbmVyTWVhc3VyZShlLndpZHRoLCEwKSx0aGlzLl9zZXRDb250YWluZXJNZWFzdXJlKGUuaGVpZ2h0LCExKSl9fSxmLl9nZXRDb250YWluZXJTaXplPWQsZi5fc2V0Q29udGFpbmVyTWVhc3VyZT1mdW5jdGlvbih0LGUpe2lmKHZvaWQgMCE9PXQpe3ZhciBpPXRoaXMuc2l6ZTtpLmlzQm9yZGVyQm94JiYodCs9ZT9pLnBhZGRpbmdMZWZ0K2kucGFkZGluZ1JpZ2h0K2kuYm9yZGVyTGVmdFdpZHRoK2kuYm9yZGVyUmlnaHRXaWR0aDppLnBhZGRpbmdCb3R0b20raS5wYWRkaW5nVG9wK2kuYm9yZGVyVG9wV2lkdGgraS5ib3JkZXJCb3R0b21XaWR0aCksdD1NYXRoLm1heCh0LDApLHRoaXMuZWxlbWVudC5zdHlsZVtlP1wid2lkdGhcIjpcImhlaWdodFwiXT10K1wicHhcIn19LGYuX2VtaXRDb21wbGV0ZU9uSXRlbXM9ZnVuY3Rpb24odCxlKXtmdW5jdGlvbiBpKCl7by5kaXNwYXRjaEV2ZW50KHQrXCJDb21wbGV0ZVwiLG51bGwsW2VdKX1mdW5jdGlvbiBuKCl7cysrLHM9PXImJmkoKX12YXIgbz10aGlzLHI9ZS5sZW5ndGg7aWYoIWV8fCFyKXJldHVybiB2b2lkIGkoKTt2YXIgcz0wO2UuZm9yRWFjaChmdW5jdGlvbihlKXtlLm9uY2UodCxuKX0pfSxmLmRpc3BhdGNoRXZlbnQ9ZnVuY3Rpb24odCxlLGkpe3ZhciBuPWU/W2VdLmNvbmNhdChpKTppO2lmKHRoaXMuZW1pdEV2ZW50KHQsbiksdSlpZih0aGlzLiRlbGVtZW50PXRoaXMuJGVsZW1lbnR8fHUodGhpcy5lbGVtZW50KSxlKXt2YXIgbz11LkV2ZW50KGUpO28udHlwZT10LHRoaXMuJGVsZW1lbnQudHJpZ2dlcihvLGkpfWVsc2UgdGhpcy4kZWxlbWVudC50cmlnZ2VyKHQsaSl9LGYuaWdub3JlPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZ2V0SXRlbSh0KTtlJiYoZS5pc0lnbm9yZWQ9ITApfSxmLnVuaWdub3JlPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZ2V0SXRlbSh0KTtlJiZkZWxldGUgZS5pc0lnbm9yZWR9LGYuc3RhbXA9ZnVuY3Rpb24odCl7dD10aGlzLl9maW5kKHQpLHQmJih0aGlzLnN0YW1wcz10aGlzLnN0YW1wcy5jb25jYXQodCksdC5mb3JFYWNoKHRoaXMuaWdub3JlLHRoaXMpKX0sZi51bnN0YW1wPWZ1bmN0aW9uKHQpe3Q9dGhpcy5fZmluZCh0KSx0JiZ0LmZvckVhY2goZnVuY3Rpb24odCl7bi5yZW1vdmVGcm9tKHRoaXMuc3RhbXBzLHQpLHRoaXMudW5pZ25vcmUodCl9LHRoaXMpfSxmLl9maW5kPWZ1bmN0aW9uKHQpe3JldHVybiB0PyhcInN0cmluZ1wiPT10eXBlb2YgdCYmKHQ9dGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwodCkpLHQ9bi5tYWtlQXJyYXkodCkpOnZvaWQgMH0sZi5fbWFuYWdlU3RhbXBzPWZ1bmN0aW9uKCl7dGhpcy5zdGFtcHMmJnRoaXMuc3RhbXBzLmxlbmd0aCYmKHRoaXMuX2dldEJvdW5kaW5nUmVjdCgpLHRoaXMuc3RhbXBzLmZvckVhY2godGhpcy5fbWFuYWdlU3RhbXAsdGhpcykpfSxmLl9nZXRCb3VuZGluZ1JlY3Q9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLmVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksZT10aGlzLnNpemU7dGhpcy5fYm91bmRpbmdSZWN0PXtsZWZ0OnQubGVmdCtlLnBhZGRpbmdMZWZ0K2UuYm9yZGVyTGVmdFdpZHRoLHRvcDp0LnRvcCtlLnBhZGRpbmdUb3ArZS5ib3JkZXJUb3BXaWR0aCxyaWdodDp0LnJpZ2h0LShlLnBhZGRpbmdSaWdodCtlLmJvcmRlclJpZ2h0V2lkdGgpLGJvdHRvbTp0LmJvdHRvbS0oZS5wYWRkaW5nQm90dG9tK2UuYm9yZGVyQm90dG9tV2lkdGgpfX0sZi5fbWFuYWdlU3RhbXA9ZCxmLl9nZXRFbGVtZW50T2Zmc2V0PWZ1bmN0aW9uKHQpe3ZhciBlPXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksbj10aGlzLl9ib3VuZGluZ1JlY3Qsbz1pKHQpLHI9e2xlZnQ6ZS5sZWZ0LW4ubGVmdC1vLm1hcmdpbkxlZnQsdG9wOmUudG9wLW4udG9wLW8ubWFyZ2luVG9wLHJpZ2h0Om4ucmlnaHQtZS5yaWdodC1vLm1hcmdpblJpZ2h0LGJvdHRvbTpuLmJvdHRvbS1lLmJvdHRvbS1vLm1hcmdpbkJvdHRvbX07cmV0dXJuIHJ9LGYuaGFuZGxlRXZlbnQ9bi5oYW5kbGVFdmVudCxmLmJpbmRSZXNpemU9ZnVuY3Rpb24oKXt0LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIix0aGlzKSx0aGlzLmlzUmVzaXplQm91bmQ9ITB9LGYudW5iaW5kUmVzaXplPWZ1bmN0aW9uKCl7dC5yZW1vdmVFdmVudExpc3RlbmVyKFwicmVzaXplXCIsdGhpcyksdGhpcy5pc1Jlc2l6ZUJvdW5kPSExfSxmLm9ucmVzaXplPWZ1bmN0aW9uKCl7dGhpcy5yZXNpemUoKX0sbi5kZWJvdW5jZU1ldGhvZChyLFwib25yZXNpemVcIiwxMDApLGYucmVzaXplPWZ1bmN0aW9uKCl7dGhpcy5pc1Jlc2l6ZUJvdW5kJiZ0aGlzLm5lZWRzUmVzaXplTGF5b3V0KCkmJnRoaXMubGF5b3V0KCl9LGYubmVlZHNSZXNpemVMYXlvdXQ9ZnVuY3Rpb24oKXt2YXIgdD1pKHRoaXMuZWxlbWVudCksZT10aGlzLnNpemUmJnQ7cmV0dXJuIGUmJnQuaW5uZXJXaWR0aCE9PXRoaXMuc2l6ZS5pbm5lcldpZHRofSxmLmFkZEl0ZW1zPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuX2l0ZW1pemUodCk7cmV0dXJuIGUubGVuZ3RoJiYodGhpcy5pdGVtcz10aGlzLml0ZW1zLmNvbmNhdChlKSksZX0sZi5hcHBlbmRlZD1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmFkZEl0ZW1zKHQpO2UubGVuZ3RoJiYodGhpcy5sYXlvdXRJdGVtcyhlLCEwKSx0aGlzLnJldmVhbChlKSl9LGYucHJlcGVuZGVkPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuX2l0ZW1pemUodCk7aWYoZS5sZW5ndGgpe3ZhciBpPXRoaXMuaXRlbXMuc2xpY2UoMCk7dGhpcy5pdGVtcz1lLmNvbmNhdChpKSx0aGlzLl9yZXNldExheW91dCgpLHRoaXMuX21hbmFnZVN0YW1wcygpLHRoaXMubGF5b3V0SXRlbXMoZSwhMCksdGhpcy5yZXZlYWwoZSksdGhpcy5sYXlvdXRJdGVtcyhpKX19LGYucmV2ZWFsPWZ1bmN0aW9uKHQpe2lmKHRoaXMuX2VtaXRDb21wbGV0ZU9uSXRlbXMoXCJyZXZlYWxcIix0KSx0JiZ0Lmxlbmd0aCl7dmFyIGU9dGhpcy51cGRhdGVTdGFnZ2VyKCk7dC5mb3JFYWNoKGZ1bmN0aW9uKHQsaSl7dC5zdGFnZ2VyKGkqZSksdC5yZXZlYWwoKX0pfX0sZi5oaWRlPWZ1bmN0aW9uKHQpe2lmKHRoaXMuX2VtaXRDb21wbGV0ZU9uSXRlbXMoXCJoaWRlXCIsdCksdCYmdC5sZW5ndGgpe3ZhciBlPXRoaXMudXBkYXRlU3RhZ2dlcigpO3QuZm9yRWFjaChmdW5jdGlvbih0LGkpe3Quc3RhZ2dlcihpKmUpLHQuaGlkZSgpfSl9fSxmLnJldmVhbEl0ZW1FbGVtZW50cz1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmdldEl0ZW1zKHQpO3RoaXMucmV2ZWFsKGUpfSxmLmhpZGVJdGVtRWxlbWVudHM9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5nZXRJdGVtcyh0KTt0aGlzLmhpZGUoZSl9LGYuZ2V0SXRlbT1mdW5jdGlvbih0KXtmb3IodmFyIGU9MDtlPHRoaXMuaXRlbXMubGVuZ3RoO2UrKyl7dmFyIGk9dGhpcy5pdGVtc1tlXTtpZihpLmVsZW1lbnQ9PXQpcmV0dXJuIGl9fSxmLmdldEl0ZW1zPWZ1bmN0aW9uKHQpe3Q9bi5tYWtlQXJyYXkodCk7dmFyIGU9W107cmV0dXJuIHQuZm9yRWFjaChmdW5jdGlvbih0KXt2YXIgaT10aGlzLmdldEl0ZW0odCk7aSYmZS5wdXNoKGkpfSx0aGlzKSxlfSxmLnJlbW92ZT1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmdldEl0ZW1zKHQpO3RoaXMuX2VtaXRDb21wbGV0ZU9uSXRlbXMoXCJyZW1vdmVcIixlKSxlJiZlLmxlbmd0aCYmZS5mb3JFYWNoKGZ1bmN0aW9uKHQpe3QucmVtb3ZlKCksbi5yZW1vdmVGcm9tKHRoaXMuaXRlbXMsdCl9LHRoaXMpfSxmLmRlc3Ryb3k9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLmVsZW1lbnQuc3R5bGU7dC5oZWlnaHQ9XCJcIix0LnBvc2l0aW9uPVwiXCIsdC53aWR0aD1cIlwiLHRoaXMuaXRlbXMuZm9yRWFjaChmdW5jdGlvbih0KXt0LmRlc3Ryb3koKX0pLHRoaXMudW5iaW5kUmVzaXplKCk7dmFyIGU9dGhpcy5lbGVtZW50Lm91dGxheWVyR1VJRDtkZWxldGUgY1tlXSxkZWxldGUgdGhpcy5lbGVtZW50Lm91dGxheWVyR1VJRCx1JiZ1LnJlbW92ZURhdGEodGhpcy5lbGVtZW50LHRoaXMuY29uc3RydWN0b3IubmFtZXNwYWNlKX0sci5kYXRhPWZ1bmN0aW9uKHQpe3Q9bi5nZXRRdWVyeUVsZW1lbnQodCk7dmFyIGU9dCYmdC5vdXRsYXllckdVSUQ7cmV0dXJuIGUmJmNbZV19LHIuY3JlYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIGk9cyhyKTtyZXR1cm4gaS5kZWZhdWx0cz1uLmV4dGVuZCh7fSxyLmRlZmF1bHRzKSxuLmV4dGVuZChpLmRlZmF1bHRzLGUpLGkuY29tcGF0T3B0aW9ucz1uLmV4dGVuZCh7fSxyLmNvbXBhdE9wdGlvbnMpLGkubmFtZXNwYWNlPXQsaS5kYXRhPXIuZGF0YSxpLkl0ZW09cyhvKSxuLmh0bWxJbml0KGksdCksdSYmdS5icmlkZ2V0JiZ1LmJyaWRnZXQodCxpKSxpfTt2YXIgbT17bXM6MSxzOjFlM307cmV0dXJuIHIuSXRlbT1vLHJ9KSxmdW5jdGlvbih0LGUpe1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoW1wib3V0bGF5ZXIvb3V0bGF5ZXJcIixcImdldC1zaXplL2dldC1zaXplXCJdLGUpOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUocmVxdWlyZShcIm91dGxheWVyXCIpLHJlcXVpcmUoXCJnZXQtc2l6ZVwiKSk6dC5NYXNvbnJ5PWUodC5PdXRsYXllcix0LmdldFNpemUpfSh3aW5kb3csZnVuY3Rpb24odCxlKXt2YXIgaT10LmNyZWF0ZShcIm1hc29ucnlcIik7aS5jb21wYXRPcHRpb25zLmZpdFdpZHRoPVwiaXNGaXRXaWR0aFwiO3ZhciBuPWkucHJvdG90eXBlO3JldHVybiBuLl9yZXNldExheW91dD1mdW5jdGlvbigpe3RoaXMuZ2V0U2l6ZSgpLHRoaXMuX2dldE1lYXN1cmVtZW50KFwiY29sdW1uV2lkdGhcIixcIm91dGVyV2lkdGhcIiksdGhpcy5fZ2V0TWVhc3VyZW1lbnQoXCJndXR0ZXJcIixcIm91dGVyV2lkdGhcIiksdGhpcy5tZWFzdXJlQ29sdW1ucygpLHRoaXMuY29sWXM9W107Zm9yKHZhciB0PTA7dDx0aGlzLmNvbHM7dCsrKXRoaXMuY29sWXMucHVzaCgwKTt0aGlzLm1heFk9MCx0aGlzLmhvcml6b250YWxDb2xJbmRleD0wfSxuLm1lYXN1cmVDb2x1bW5zPWZ1bmN0aW9uKCl7aWYodGhpcy5nZXRDb250YWluZXJXaWR0aCgpLCF0aGlzLmNvbHVtbldpZHRoKXt2YXIgdD10aGlzLml0ZW1zWzBdLGk9dCYmdC5lbGVtZW50O3RoaXMuY29sdW1uV2lkdGg9aSYmZShpKS5vdXRlcldpZHRofHx0aGlzLmNvbnRhaW5lcldpZHRofXZhciBuPXRoaXMuY29sdW1uV2lkdGgrPXRoaXMuZ3V0dGVyLG89dGhpcy5jb250YWluZXJXaWR0aCt0aGlzLmd1dHRlcixyPW8vbixzPW4tbyVuLGE9cyYmMT5zP1wicm91bmRcIjpcImZsb29yXCI7cj1NYXRoW2FdKHIpLHRoaXMuY29scz1NYXRoLm1heChyLDEpfSxuLmdldENvbnRhaW5lcldpZHRoPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fZ2V0T3B0aW9uKFwiZml0V2lkdGhcIiksaT10P3RoaXMuZWxlbWVudC5wYXJlbnROb2RlOnRoaXMuZWxlbWVudCxuPWUoaSk7dGhpcy5jb250YWluZXJXaWR0aD1uJiZuLmlubmVyV2lkdGh9LG4uX2dldEl0ZW1MYXlvdXRQb3NpdGlvbj1mdW5jdGlvbih0KXt0LmdldFNpemUoKTt2YXIgZT10LnNpemUub3V0ZXJXaWR0aCV0aGlzLmNvbHVtbldpZHRoLGk9ZSYmMT5lP1wicm91bmRcIjpcImNlaWxcIixuPU1hdGhbaV0odC5zaXplLm91dGVyV2lkdGgvdGhpcy5jb2x1bW5XaWR0aCk7bj1NYXRoLm1pbihuLHRoaXMuY29scyk7Zm9yKHZhciBvPXRoaXMub3B0aW9ucy5ob3Jpem9udGFsT3JkZXI/XCJfZ2V0SG9yaXpvbnRhbENvbFBvc2l0aW9uXCI6XCJfZ2V0VG9wQ29sUG9zaXRpb25cIixyPXRoaXNbb10obix0KSxzPXt4OnRoaXMuY29sdW1uV2lkdGgqci5jb2wseTpyLnl9LGE9ci55K3Quc2l6ZS5vdXRlckhlaWdodCxoPW4rci5jb2wsdT1yLmNvbDtoPnU7dSsrKXRoaXMuY29sWXNbdV09YTtyZXR1cm4gc30sbi5fZ2V0VG9wQ29sUG9zaXRpb249ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5fZ2V0VG9wQ29sR3JvdXAodCksaT1NYXRoLm1pbi5hcHBseShNYXRoLGUpO3JldHVybntjb2w6ZS5pbmRleE9mKGkpLHk6aX19LG4uX2dldFRvcENvbEdyb3VwPWZ1bmN0aW9uKHQpe2lmKDI+dClyZXR1cm4gdGhpcy5jb2xZcztmb3IodmFyIGU9W10saT10aGlzLmNvbHMrMS10LG49MDtpPm47bisrKWVbbl09dGhpcy5fZ2V0Q29sR3JvdXBZKG4sdCk7cmV0dXJuIGV9LG4uX2dldENvbEdyb3VwWT1mdW5jdGlvbih0LGUpe2lmKDI+ZSlyZXR1cm4gdGhpcy5jb2xZc1t0XTt2YXIgaT10aGlzLmNvbFlzLnNsaWNlKHQsdCtlKTtyZXR1cm4gTWF0aC5tYXguYXBwbHkoTWF0aCxpKX0sbi5fZ2V0SG9yaXpvbnRhbENvbFBvc2l0aW9uPWZ1bmN0aW9uKHQsZSl7dmFyIGk9dGhpcy5ob3Jpem9udGFsQ29sSW5kZXgldGhpcy5jb2xzLG49dD4xJiZpK3Q+dGhpcy5jb2xzO2k9bj8wOmk7dmFyIG89ZS5zaXplLm91dGVyV2lkdGgmJmUuc2l6ZS5vdXRlckhlaWdodDtyZXR1cm4gdGhpcy5ob3Jpem9udGFsQ29sSW5kZXg9bz9pK3Q6dGhpcy5ob3Jpem9udGFsQ29sSW5kZXgse2NvbDppLHk6dGhpcy5fZ2V0Q29sR3JvdXBZKGksdCl9fSxuLl9tYW5hZ2VTdGFtcD1mdW5jdGlvbih0KXt2YXIgaT1lKHQpLG49dGhpcy5fZ2V0RWxlbWVudE9mZnNldCh0KSxvPXRoaXMuX2dldE9wdGlvbihcIm9yaWdpbkxlZnRcIikscj1vP24ubGVmdDpuLnJpZ2h0LHM9citpLm91dGVyV2lkdGgsYT1NYXRoLmZsb29yKHIvdGhpcy5jb2x1bW5XaWR0aCk7YT1NYXRoLm1heCgwLGEpO3ZhciBoPU1hdGguZmxvb3Iocy90aGlzLmNvbHVtbldpZHRoKTtoLT1zJXRoaXMuY29sdW1uV2lkdGg/MDoxLGg9TWF0aC5taW4odGhpcy5jb2xzLTEsaCk7Zm9yKHZhciB1PXRoaXMuX2dldE9wdGlvbihcIm9yaWdpblRvcFwiKSxkPSh1P24udG9wOm4uYm90dG9tKStpLm91dGVySGVpZ2h0LGw9YTtoPj1sO2wrKyl0aGlzLmNvbFlzW2xdPU1hdGgubWF4KGQsdGhpcy5jb2xZc1tsXSl9LG4uX2dldENvbnRhaW5lclNpemU9ZnVuY3Rpb24oKXt0aGlzLm1heFk9TWF0aC5tYXguYXBwbHkoTWF0aCx0aGlzLmNvbFlzKTt2YXIgdD17aGVpZ2h0OnRoaXMubWF4WX07cmV0dXJuIHRoaXMuX2dldE9wdGlvbihcImZpdFdpZHRoXCIpJiYodC53aWR0aD10aGlzLl9nZXRDb250YWluZXJGaXRXaWR0aCgpKSx0fSxuLl9nZXRDb250YWluZXJGaXRXaWR0aD1mdW5jdGlvbigpe2Zvcih2YXIgdD0wLGU9dGhpcy5jb2xzOy0tZSYmMD09PXRoaXMuY29sWXNbZV07KXQrKztyZXR1cm4odGhpcy5jb2xzLXQpKnRoaXMuY29sdW1uV2lkdGgtdGhpcy5ndXR0ZXJ9LG4ubmVlZHNSZXNpemVMYXlvdXQ9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLmNvbnRhaW5lcldpZHRoO3JldHVybiB0aGlzLmdldENvbnRhaW5lcldpZHRoKCksdCE9dGhpcy5jb250YWluZXJXaWR0aH0saX0pOyIsIlxuZnVuY3Rpb24gc3RhckZ1bmN0aW9uKHgsIHkpIHtcblxuICAgIGFwaV91cmwgPSAnL2FwaS92MS9zdGFyLycgKyB5ICsgJy8nO1xuXG4gICAgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJmYS1zdGFyLW9cIikpe1xuICAgICAgICAgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJub3QtbG9nZ2VkLWluXCIpKXtcbi8vICAgICAgICAgICAgJChcIiNsb2dpbmZvcm1cIikuY3NzKHtcInZpc2liaWxpdHlcIjpcInZpc2libGVcIixcImRpc3BsYXlcIjpcImJsb2NrXCJ9KTtcbiAgICAgICAgICAgICQoXCIjcmVzdGF1cmFudFwiKS5jc3Moe1wiZGlzcGxheVwiOlwibm9uZVwifSk7XG4gICAgICAgICAgICAkKFwiI2xvZ2luZm9ybVwiKS5mYWRlSW4oKTtcbi8vICAgICAgICAgICAgJChcIiNyZXN0YXVyYW50XCIpLmZhZGVPdXQoKTtcbiAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIHguY2xhc3NMaXN0LnJlbW92ZShcImZhLXN0YXItb1wiKVxuICAgICAgICAgICAgeC5jbGFzc0xpc3QuYWRkKFwiZmEtc3RhclwiKVxuICAgICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogYXBpX3VybCwgICAgLy9Zb3VyIGFwaSB1cmxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdQVVQnLCAgIC8vdHlwZSBpcyBhbnkgSFRUUCBtZXRob2RcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgICAgICAvL0RhdGEgYXMganMgb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIDtcbiAgICAgICAgIH1cblxuICAgIH0gZWxzZSBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcImZhLXN0YXJcIikpe1xuXG4gICAgICAgIHguY2xhc3NMaXN0LnJlbW92ZShcImZhLXN0YXJcIilcbiAgICAgICAgeC5jbGFzc0xpc3QuYWRkKFwiZmEtc3Rhci1vXCIpXG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICAgICAgICAgIHVybDogYXBpX3VybCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ0RFTEVURScsXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG8gc29tZXRoaW5nIHdpdGggdGhlIHJlc3VsdFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICA7XG4gICAgfVxuXG59XG5cbiQoJy5jbG9zZS1pY29uJykub24oJ2NsaWNrJyxmdW5jdGlvbigpIHtcbiAgJCh0aGlzKS5jbG9zZXN0KCcuY2FyZCcpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcbiAgJChcIiNyZXN0YXVyYW50XCIpLmZhZGVJbigpO1xufSkiLCIoZnVuY3Rpb24oJCl7XCJ1c2Ugc3RyaWN0XCI7dmFyIE1hZ2ljU3VnZ2VzdD1mdW5jdGlvbihlbGVtZW50LG9wdGlvbnMpe3ZhciBtcz10aGlzO3ZhciBkZWZhdWx0cz17YWxsb3dGcmVlRW50cmllczp0cnVlLGFsbG93RHVwbGljYXRlczpmYWxzZSxhamF4Q29uZmlnOnt9LGF1dG9TZWxlY3Q6dHJ1ZSxzZWxlY3RGaXJzdDpmYWxzZSxxdWVyeVBhcmFtOlwicXVlcnlcIixiZWZvcmVTZW5kOmZ1bmN0aW9uKCl7fSxjbHM6XCJcIixkYXRhOm51bGwsZGF0YVVybFBhcmFtczp7fSxkaXNhYmxlZDpmYWxzZSxkaXNhYmxlZEZpZWxkOm51bGwsZGlzcGxheUZpZWxkOlwibmFtZVwiLGVkaXRhYmxlOnRydWUsZXhwYW5kZWQ6ZmFsc2UsZXhwYW5kT25Gb2N1czpmYWxzZSxncm91cEJ5Om51bGwsaGlkZVRyaWdnZXI6ZmFsc2UsaGlnaGxpZ2h0OnRydWUsaWQ6bnVsbCxpbmZvTXNnQ2xzOlwiXCIsaW5wdXRDZmc6e30saW52YWxpZENsczpcIm1zLWludlwiLG1hdGNoQ2FzZTpmYWxzZSxtYXhEcm9wSGVpZ2h0OjI5MCxtYXhFbnRyeUxlbmd0aDpudWxsLG1heEVudHJ5UmVuZGVyZXI6ZnVuY3Rpb24odil7cmV0dXJuXCJQbGVhc2UgcmVkdWNlIHlvdXIgZW50cnkgYnkgXCIrditcIiBjaGFyYWN0ZXJcIisodj4xP1wic1wiOlwiXCIpfSxtYXhTdWdnZXN0aW9uczpudWxsLG1heFNlbGVjdGlvbjoxMCxtYXhTZWxlY3Rpb25SZW5kZXJlcjpmdW5jdGlvbih2KXtyZXR1cm5cIllvdSBjYW5ub3QgY2hvb3NlIG1vcmUgdGhhbiBcIit2K1wiIGl0ZW1cIisodj4xP1wic1wiOlwiXCIpfSxtZXRob2Q6XCJQT1NUXCIsbWluQ2hhcnM6MCxtaW5DaGFyc1JlbmRlcmVyOmZ1bmN0aW9uKHYpe3JldHVyblwiUGxlYXNlIHR5cGUgXCIrditcIiBtb3JlIGNoYXJhY3RlclwiKyh2PjE/XCJzXCI6XCJcIil9LG1vZGU6XCJsb2NhbFwiLG5hbWU6bnVsbCxub1N1Z2dlc3Rpb25UZXh0OlwiTm8gc3VnZ2VzdGlvbnNcIixwbGFjZWhvbGRlcjpcIlR5cGUgb3IgY2xpY2sgaGVyZVwiLHJlbmRlcmVyOm51bGwscmVxdWlyZWQ6ZmFsc2UscmVzdWx0QXNTdHJpbmc6ZmFsc2UscmVzdWx0QXNTdHJpbmdEZWxpbWl0ZXI6XCIsXCIscmVzdWx0c0ZpZWxkOlwicmVzdWx0c1wiLHNlbGVjdGlvbkNsczpcIlwiLHNlbGVjdGlvbkNvbnRhaW5lcjpudWxsLHNlbGVjdGlvblBvc2l0aW9uOlwiaW5uZXJcIixzZWxlY3Rpb25SZW5kZXJlcjpudWxsLHNlbGVjdGlvblN0YWNrZWQ6ZmFsc2Usc29ydERpcjpcImFzY1wiLHNvcnRPcmRlcjpudWxsLHN0cmljdFN1Z2dlc3Q6ZmFsc2Usc3R5bGU6XCJcIix0b2dnbGVPbkNsaWNrOmZhbHNlLHR5cGVEZWxheTo0MDAsdXNlVGFiS2V5OmZhbHNlLHVzZUNvbW1hS2V5OnRydWUsdXNlWmVicmFTdHlsZTpmYWxzZSx2YWx1ZTpudWxsLHZhbHVlRmllbGQ6XCJpZFwiLHZyZWdleDpudWxsLHZ0eXBlOm51bGx9O3ZhciBjb25mPSQuZXh0ZW5kKHt9LG9wdGlvbnMpO3ZhciBjZmc9JC5leHRlbmQodHJ1ZSx7fSxkZWZhdWx0cyxjb25mKTt0aGlzLmFkZFRvU2VsZWN0aW9uPWZ1bmN0aW9uKGl0ZW1zLGlzU2lsZW50KXtpZighY2ZnLm1heFNlbGVjdGlvbnx8X3NlbGVjdGlvbi5sZW5ndGg8Y2ZnLm1heFNlbGVjdGlvbil7aWYoISQuaXNBcnJheShpdGVtcykpe2l0ZW1zPVtpdGVtc119dmFyIHZhbHVlY2hhbmdlZD1mYWxzZTskLmVhY2goaXRlbXMsZnVuY3Rpb24oaW5kZXgsanNvbil7aWYoY2ZnLmFsbG93RHVwbGljYXRlc3x8JC5pbkFycmF5KGpzb25bY2ZnLnZhbHVlRmllbGRdLG1zLmdldFZhbHVlKCkpPT09LTEpe19zZWxlY3Rpb24ucHVzaChqc29uKTt2YWx1ZWNoYW5nZWQ9dHJ1ZX19KTtpZih2YWx1ZWNoYW5nZWQ9PT10cnVlKXtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTt0aGlzLmVtcHR5KCk7aWYoaXNTaWxlbnQhPT10cnVlKXskKHRoaXMpLnRyaWdnZXIoXCJzZWxlY3Rpb25jaGFuZ2VcIixbdGhpcyx0aGlzLmdldFNlbGVjdGlvbigpXSl9fX10aGlzLmlucHV0LmF0dHIoXCJwbGFjZWhvbGRlclwiLGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmdGhpcy5nZXRWYWx1ZSgpLmxlbmd0aD4wP1wiXCI6Y2ZnLnBsYWNlaG9sZGVyKX07dGhpcy5jbGVhcj1mdW5jdGlvbihpc1NpbGVudCl7dGhpcy5yZW1vdmVGcm9tU2VsZWN0aW9uKF9zZWxlY3Rpb24uc2xpY2UoMCksaXNTaWxlbnQpfTt0aGlzLmNvbGxhcHNlPWZ1bmN0aW9uKCl7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7dGhpcy5jb21ib2JveC5kZXRhY2goKTtjZmcuZXhwYW5kZWQ9ZmFsc2U7JCh0aGlzKS50cmlnZ2VyKFwiY29sbGFwc2VcIixbdGhpc10pfX07dGhpcy5kaXNhYmxlPWZ1bmN0aW9uKCl7dGhpcy5jb250YWluZXIuYWRkQ2xhc3MoXCJtcy1jdG4tZGlzYWJsZWRcIik7Y2ZnLmRpc2FibGVkPXRydWU7bXMuaW5wdXQuYXR0cihcImRpc2FibGVkXCIsdHJ1ZSl9O3RoaXMuZW1wdHk9ZnVuY3Rpb24oKXt0aGlzLmlucHV0LnZhbChcIlwiKX07dGhpcy5lbmFibGU9ZnVuY3Rpb24oKXt0aGlzLmNvbnRhaW5lci5yZW1vdmVDbGFzcyhcIm1zLWN0bi1kaXNhYmxlZFwiKTtjZmcuZGlzYWJsZWQ9ZmFsc2U7bXMuaW5wdXQuYXR0cihcImRpc2FibGVkXCIsZmFsc2UpfTt0aGlzLmV4cGFuZD1mdW5jdGlvbigpe2lmKCFjZmcuZXhwYW5kZWQmJih0aGlzLmlucHV0LnZhbCgpLmxlbmd0aD49Y2ZnLm1pbkNoYXJzfHx0aGlzLmNvbWJvYm94LmNoaWxkcmVuKCkuc2l6ZSgpPjApKXt0aGlzLmNvbWJvYm94LmFwcGVuZFRvKHRoaXMuY29udGFpbmVyKTtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtjZmcuZXhwYW5kZWQ9dHJ1ZTskKHRoaXMpLnRyaWdnZXIoXCJleHBhbmRcIixbdGhpc10pfX07dGhpcy5pc0Rpc2FibGVkPWZ1bmN0aW9uKCl7cmV0dXJuIGNmZy5kaXNhYmxlZH07dGhpcy5pc1ZhbGlkPWZ1bmN0aW9uKCl7dmFyIHZhbGlkPWNmZy5yZXF1aXJlZD09PWZhbHNlfHxfc2VsZWN0aW9uLmxlbmd0aD4wO2lmKGNmZy52dHlwZXx8Y2ZnLnZyZWdleCl7JC5lYWNoKF9zZWxlY3Rpb24sZnVuY3Rpb24oaW5kZXgsaXRlbSl7dmFsaWQ9dmFsaWQmJnNlbGYuX3ZhbGlkYXRlU2luZ2xlSXRlbShpdGVtW2NmZy52YWx1ZUZpZWxkXSl9KX1yZXR1cm4gdmFsaWR9O3RoaXMuZ2V0RGF0YVVybFBhcmFtcz1mdW5jdGlvbigpe3JldHVybiBjZmcuZGF0YVVybFBhcmFtc307dGhpcy5nZXROYW1lPWZ1bmN0aW9uKCl7cmV0dXJuIGNmZy5uYW1lfTt0aGlzLmdldFNlbGVjdGlvbj1mdW5jdGlvbigpe3JldHVybiBfc2VsZWN0aW9ufTt0aGlzLmdldFJhd1ZhbHVlPWZ1bmN0aW9uKCl7cmV0dXJuIG1zLmlucHV0LnZhbCgpfTt0aGlzLmdldFZhbHVlPWZ1bmN0aW9uKCl7cmV0dXJuICQubWFwKF9zZWxlY3Rpb24sZnVuY3Rpb24obyl7cmV0dXJuIG9bY2ZnLnZhbHVlRmllbGRdfSl9O3RoaXMucmVtb3ZlRnJvbVNlbGVjdGlvbj1mdW5jdGlvbihpdGVtcyxpc1NpbGVudCl7aWYoISQuaXNBcnJheShpdGVtcykpe2l0ZW1zPVtpdGVtc119dmFyIHZhbHVlY2hhbmdlZD1mYWxzZTskLmVhY2goaXRlbXMsZnVuY3Rpb24oaW5kZXgsanNvbil7dmFyIGk9JC5pbkFycmF5KGpzb25bY2ZnLnZhbHVlRmllbGRdLG1zLmdldFZhbHVlKCkpO2lmKGk+LTEpe19zZWxlY3Rpb24uc3BsaWNlKGksMSk7dmFsdWVjaGFuZ2VkPXRydWV9fSk7aWYodmFsdWVjaGFuZ2VkPT09dHJ1ZSl7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7aWYoaXNTaWxlbnQhPT10cnVlKXskKHRoaXMpLnRyaWdnZXIoXCJzZWxlY3Rpb25jaGFuZ2VcIixbdGhpcyx0aGlzLmdldFNlbGVjdGlvbigpXSl9aWYoY2ZnLmV4cGFuZE9uRm9jdXMpe21zLmV4cGFuZCgpfWlmKGNmZy5leHBhbmRlZCl7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCl9fXRoaXMuaW5wdXQuYXR0cihcInBsYWNlaG9sZGVyXCIsY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiJiZ0aGlzLmdldFZhbHVlKCkubGVuZ3RoPjA/XCJcIjpjZmcucGxhY2Vob2xkZXIpfTt0aGlzLmdldERhdGE9ZnVuY3Rpb24oKXtyZXR1cm4gX2NiRGF0YX07dGhpcy5zZXREYXRhPWZ1bmN0aW9uKGRhdGEpe2NmZy5kYXRhPWRhdGE7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCl9O3RoaXMuc2V0TmFtZT1mdW5jdGlvbihuYW1lKXtjZmcubmFtZT1uYW1lO2lmKG5hbWUpe2NmZy5uYW1lKz1uYW1lLmluZGV4T2YoXCJbXVwiKT4wP1wiXCI6XCJbXVwifWlmKG1zLl92YWx1ZUNvbnRhaW5lcil7JC5lYWNoKG1zLl92YWx1ZUNvbnRhaW5lci5jaGlsZHJlbigpLGZ1bmN0aW9uKGksZWwpe2VsLm5hbWU9Y2ZnLm5hbWV9KX19O3RoaXMuc2V0U2VsZWN0aW9uPWZ1bmN0aW9uKGl0ZW1zKXt0aGlzLmNsZWFyKCk7dGhpcy5hZGRUb1NlbGVjdGlvbihpdGVtcyl9O3RoaXMuc2V0VmFsdWU9ZnVuY3Rpb24odmFsdWVzKXt2YXIgaXRlbXM9W107JC5lYWNoKHZhbHVlcyxmdW5jdGlvbihpbmRleCx2YWx1ZSl7dmFyIGZvdW5kPWZhbHNlOyQuZWFjaChfY2JEYXRhLGZ1bmN0aW9uKGksaXRlbSl7aWYoaXRlbVtjZmcudmFsdWVGaWVsZF09PXZhbHVlKXtpdGVtcy5wdXNoKGl0ZW0pO2ZvdW5kPXRydWU7cmV0dXJuIGZhbHNlfX0pO2lmKCFmb3VuZCl7aWYodHlwZW9mIHZhbHVlPT09XCJvYmplY3RcIil7aXRlbXMucHVzaCh2YWx1ZSl9ZWxzZXt2YXIganNvbj17fTtqc29uW2NmZy52YWx1ZUZpZWxkXT12YWx1ZTtqc29uW2NmZy5kaXNwbGF5RmllbGRdPXZhbHVlO2l0ZW1zLnB1c2goanNvbil9fX0pO2lmKGl0ZW1zLmxlbmd0aD4wKXt0aGlzLmFkZFRvU2VsZWN0aW9uKGl0ZW1zKX19O3RoaXMuc2V0RGF0YVVybFBhcmFtcz1mdW5jdGlvbihwYXJhbXMpe2NmZy5kYXRhVXJsUGFyYW1zPSQuZXh0ZW5kKHt9LHBhcmFtcyl9O3ZhciBfc2VsZWN0aW9uPVtdLF9jb21ib0l0ZW1IZWlnaHQ9MCxfdGltZXIsX2hhc0ZvY3VzPWZhbHNlLF9ncm91cHM9bnVsbCxfY2JEYXRhPVtdLF9jdHJsRG93bj1mYWxzZSxLRVlDT0RFUz17QkFDS1NQQUNFOjgsVEFCOjksRU5URVI6MTMsQ1RSTDoxNyxFU0M6MjcsU1BBQ0U6MzIsVVBBUlJPVzozOCxET1dOQVJST1c6NDAsQ09NTUE6MTg4fTt2YXIgc2VsZj17X2Rpc3BsYXlTdWdnZXN0aW9uczpmdW5jdGlvbihkYXRhKXttcy5jb21ib2JveC5zaG93KCk7bXMuY29tYm9ib3guZW1wdHkoKTt2YXIgcmVzSGVpZ2h0PTAsbmJHcm91cHM9MDtpZihfZ3JvdXBzPT09bnVsbCl7c2VsZi5fcmVuZGVyQ29tYm9JdGVtcyhkYXRhKTtyZXNIZWlnaHQ9X2NvbWJvSXRlbUhlaWdodCpkYXRhLmxlbmd0aH1lbHNle2Zvcih2YXIgZ3JwTmFtZSBpbiBfZ3JvdXBzKXtuYkdyb3Vwcys9MTskKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXJlcy1ncm91cFwiLGh0bWw6Z3JwTmFtZX0pLmFwcGVuZFRvKG1zLmNvbWJvYm94KTtzZWxmLl9yZW5kZXJDb21ib0l0ZW1zKF9ncm91cHNbZ3JwTmFtZV0uaXRlbXMsdHJ1ZSl9dmFyIF9ncm91cEl0ZW1IZWlnaHQ9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtZ3JvdXBcIikub3V0ZXJIZWlnaHQoKTtpZihfZ3JvdXBJdGVtSGVpZ2h0IT09bnVsbCl7dmFyIHRtcFJlc0hlaWdodD1uYkdyb3VwcypfZ3JvdXBJdGVtSGVpZ2h0O3Jlc0hlaWdodD1fY29tYm9JdGVtSGVpZ2h0KmRhdGEubGVuZ3RoK3RtcFJlc0hlaWdodH1lbHNle3Jlc0hlaWdodD1fY29tYm9JdGVtSGVpZ2h0KihkYXRhLmxlbmd0aCtuYkdyb3Vwcyl9fWlmKHJlc0hlaWdodDxtcy5jb21ib2JveC5oZWlnaHQoKXx8cmVzSGVpZ2h0PD1jZmcubWF4RHJvcEhlaWdodCl7bXMuY29tYm9ib3guaGVpZ2h0KHJlc0hlaWdodCl9ZWxzZSBpZihyZXNIZWlnaHQ+PW1zLmNvbWJvYm94LmhlaWdodCgpJiZyZXNIZWlnaHQ+Y2ZnLm1heERyb3BIZWlnaHQpe21zLmNvbWJvYm94LmhlaWdodChjZmcubWF4RHJvcEhlaWdodCl9aWYoZGF0YS5sZW5ndGg9PT0xJiZjZmcuYXV0b1NlbGVjdD09PXRydWUpe21zLmNvbWJvYm94LmNoaWxkcmVuKCkuZmlsdGVyKFwiOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmxhc3RcIikuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIil9aWYoY2ZnLnNlbGVjdEZpcnN0PT09dHJ1ZSl7bXMuY29tYm9ib3guY2hpbGRyZW4oKS5maWx0ZXIoXCI6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3RcIikuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIil9aWYoZGF0YS5sZW5ndGg9PT0wJiZtcy5nZXRSYXdWYWx1ZSgpIT09XCJcIil7dmFyIG5vU3VnZ2VzdGlvblRleHQ9Y2ZnLm5vU3VnZ2VzdGlvblRleHQucmVwbGFjZSgvXFx7XFx7LipcXH1cXH0vLG1zLmlucHV0LnZhbCgpKTtzZWxmLl91cGRhdGVIZWxwZXIobm9TdWdnZXN0aW9uVGV4dCk7bXMuY29sbGFwc2UoKX1pZihjZmcuYWxsb3dGcmVlRW50cmllcz09PWZhbHNlKXtpZihkYXRhLmxlbmd0aD09PTApeyQobXMuaW5wdXQpLmFkZENsYXNzKGNmZy5pbnZhbGlkQ2xzKTttcy5jb21ib2JveC5oaWRlKCl9ZWxzZXskKG1zLmlucHV0KS5yZW1vdmVDbGFzcyhjZmcuaW52YWxpZENscyl9fX0sX2dldEVudHJpZXNGcm9tU3RyaW5nQXJyYXk6ZnVuY3Rpb24oZGF0YSl7dmFyIGpzb249W107JC5lYWNoKGRhdGEsZnVuY3Rpb24oaW5kZXgscyl7dmFyIGVudHJ5PXt9O2VudHJ5W2NmZy5kaXNwbGF5RmllbGRdPWVudHJ5W2NmZy52YWx1ZUZpZWxkXT0kLnRyaW0ocyk7anNvbi5wdXNoKGVudHJ5KX0pO3JldHVybiBqc29ufSxfaGlnaGxpZ2h0U3VnZ2VzdGlvbjpmdW5jdGlvbihodG1sKXt2YXIgcT1tcy5pbnB1dC52YWwoKTt2YXIgc3BlY2lhbENoYXJhY3RlcnM9W1wiXlwiLFwiJFwiLFwiKlwiLFwiK1wiLFwiP1wiLFwiLlwiLFwiKFwiLFwiKVwiLFwiOlwiLFwiIVwiLFwifFwiLFwie1wiLFwifVwiLFwiW1wiLFwiXVwiXTskLmVhY2goc3BlY2lhbENoYXJhY3RlcnMsZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3E9cS5yZXBsYWNlKHZhbHVlLFwiXFxcXFwiK3ZhbHVlKX0pO2lmKHEubGVuZ3RoPT09MCl7cmV0dXJuIGh0bWx9dmFyIGdsb2I9Y2ZnLm1hdGNoQ2FzZT09PXRydWU/XCJnXCI6XCJnaVwiO3JldHVybiBodG1sLnJlcGxhY2UobmV3IFJlZ0V4cChcIihcIitxK1wiKSg/IShbXjxdKyk/PilcIixnbG9iKSxcIjxlbT4kMTwvZW0+XCIpfSxfbW92ZVNlbGVjdGVkUm93OmZ1bmN0aW9uKGRpcil7aWYoIWNmZy5leHBhbmRlZCl7bXMuZXhwYW5kKCl9dmFyIGxpc3Qsc3RhcnQsYWN0aXZlLHNjcm9sbFBvcztsaXN0PW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIik7aWYoZGlyPT09XCJkb3duXCIpe3N0YXJ0PWxpc3QuZXEoMCl9ZWxzZXtzdGFydD1saXN0LmZpbHRlcihcIjpsYXN0XCIpfWFjdGl2ZT1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdFwiKTtpZihhY3RpdmUubGVuZ3RoPjApe2lmKGRpcj09PVwiZG93blwiKXtzdGFydD1hY3RpdmUubmV4dEFsbChcIi5tcy1yZXMtaXRlbTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKVwiKS5maXJzdCgpO2lmKHN0YXJ0Lmxlbmd0aD09PTApe3N0YXJ0PWxpc3QuZXEoMCl9c2Nyb2xsUG9zPW1zLmNvbWJvYm94LnNjcm9sbFRvcCgpO21zLmNvbWJvYm94LnNjcm9sbFRvcCgwKTtpZihzdGFydFswXS5vZmZzZXRUb3Arc3RhcnQub3V0ZXJIZWlnaHQoKT5tcy5jb21ib2JveC5oZWlnaHQoKSl7bXMuY29tYm9ib3guc2Nyb2xsVG9wKHNjcm9sbFBvcytfY29tYm9JdGVtSGVpZ2h0KX19ZWxzZXtzdGFydD1hY3RpdmUucHJldkFsbChcIi5tcy1yZXMtaXRlbTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKVwiKS5maXJzdCgpO2lmKHN0YXJ0Lmxlbmd0aD09PTApe3N0YXJ0PWxpc3QuZmlsdGVyKFwiOmxhc3RcIik7bXMuY29tYm9ib3guc2Nyb2xsVG9wKF9jb21ib0l0ZW1IZWlnaHQqbGlzdC5sZW5ndGgpfWlmKHN0YXJ0WzBdLm9mZnNldFRvcDxtcy5jb21ib2JveC5zY3JvbGxUb3AoKSl7bXMuY29tYm9ib3guc2Nyb2xsVG9wKG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpLV9jb21ib0l0ZW1IZWlnaHQpfX19bGlzdC5yZW1vdmVDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtzdGFydC5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKX0sX3Byb2Nlc3NTdWdnZXN0aW9uczpmdW5jdGlvbihzb3VyY2Upe3ZhciBqc29uPW51bGwsZGF0YT1zb3VyY2V8fGNmZy5kYXRhO2lmKGRhdGEhPT1udWxsKXtpZih0eXBlb2YgZGF0YT09PVwiZnVuY3Rpb25cIil7ZGF0YT1kYXRhLmNhbGwobXMsbXMuZ2V0UmF3VmFsdWUoKSl9aWYodHlwZW9mIGRhdGE9PT1cInN0cmluZ1wiKXskKG1zKS50cmlnZ2VyKFwiYmVmb3JlbG9hZFwiLFttc10pO3ZhciBxdWVyeVBhcmFtcz17fTtxdWVyeVBhcmFtc1tjZmcucXVlcnlQYXJhbV09bXMuaW5wdXQudmFsKCk7dmFyIHBhcmFtcz0kLmV4dGVuZChxdWVyeVBhcmFtcyxjZmcuZGF0YVVybFBhcmFtcyk7JC5hamF4KCQuZXh0ZW5kKHt0eXBlOmNmZy5tZXRob2QsdXJsOmRhdGEsZGF0YTpwYXJhbXMsYmVmb3JlU2VuZDpjZmcuYmVmb3JlU2VuZCxzdWNjZXNzOmZ1bmN0aW9uKGFzeW5jRGF0YSl7anNvbj10eXBlb2YgYXN5bmNEYXRhPT09XCJzdHJpbmdcIj9KU09OLnBhcnNlKGFzeW5jRGF0YSk6YXN5bmNEYXRhO3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucyhqc29uKTskKG1zKS50cmlnZ2VyKFwibG9hZFwiLFttcyxqc29uXSk7aWYoc2VsZi5fYXN5bmNWYWx1ZXMpe21zLnNldFZhbHVlKHR5cGVvZiBzZWxmLl9hc3luY1ZhbHVlcz09PVwic3RyaW5nXCI/SlNPTi5wYXJzZShzZWxmLl9hc3luY1ZhbHVlcyk6c2VsZi5fYXN5bmNWYWx1ZXMpO3NlbGYuX3JlbmRlclNlbGVjdGlvbigpO2RlbGV0ZSBzZWxmLl9hc3luY1ZhbHVlc319LGVycm9yOmZ1bmN0aW9uKCl7dGhyb3dcIkNvdWxkIG5vdCByZWFjaCBzZXJ2ZXJcIn19LGNmZy5hamF4Q29uZmlnKSk7cmV0dXJufWVsc2V7aWYoZGF0YS5sZW5ndGg+MCYmdHlwZW9mIGRhdGFbMF09PT1cInN0cmluZ1wiKXtfY2JEYXRhPXNlbGYuX2dldEVudHJpZXNGcm9tU3RyaW5nQXJyYXkoZGF0YSl9ZWxzZXtfY2JEYXRhPWRhdGFbY2ZnLnJlc3VsdHNGaWVsZF18fGRhdGF9fXZhciBzb3J0ZWREYXRhPWNmZy5tb2RlPT09XCJyZW1vdGVcIj9fY2JEYXRhOnNlbGYuX3NvcnRBbmRUcmltKF9jYkRhdGEpO3NlbGYuX2Rpc3BsYXlTdWdnZXN0aW9ucyhzZWxmLl9ncm91cChzb3J0ZWREYXRhKSl9fSxfcmVuZGVyOmZ1bmN0aW9uKGVsKXttcy5zZXROYW1lKGNmZy5uYW1lKTttcy5jb250YWluZXI9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1jdG4gZm9ybS1jb250cm9sIFwiKyhjZmcucmVzdWx0QXNTdHJpbmc/XCJtcy1hcy1zdHJpbmcgXCI6XCJcIikrY2ZnLmNscysoJChlbCkuaGFzQ2xhc3MoXCJpbnB1dC1sZ1wiKT9cIiBpbnB1dC1sZ1wiOlwiXCIpKygkKGVsKS5oYXNDbGFzcyhcImlucHV0LXNtXCIpP1wiIGlucHV0LXNtXCI6XCJcIikrKGNmZy5kaXNhYmxlZD09PXRydWU/XCIgbXMtY3RuLWRpc2FibGVkXCI6XCJcIikrKGNmZy5lZGl0YWJsZT09PXRydWU/XCJcIjpcIiBtcy1jdG4tcmVhZG9ubHlcIikrKGNmZy5oaWRlVHJpZ2dlcj09PWZhbHNlP1wiXCI6XCIgbXMtbm8tdHJpZ2dlclwiKSxzdHlsZTpjZmcuc3R5bGUsaWQ6Y2ZnLmlkfSk7bXMuY29udGFpbmVyLmZvY3VzKCQucHJveHkoaGFuZGxlcnMuX29uRm9jdXMsdGhpcykpO21zLmNvbnRhaW5lci5ibHVyKCQucHJveHkoaGFuZGxlcnMuX29uQmx1cix0aGlzKSk7bXMuY29udGFpbmVyLmtleWRvd24oJC5wcm94eShoYW5kbGVycy5fb25LZXlEb3duLHRoaXMpKTttcy5jb250YWluZXIua2V5dXAoJC5wcm94eShoYW5kbGVycy5fb25LZXlVcCx0aGlzKSk7bXMuaW5wdXQ9JChcIjxpbnB1dC8+XCIsJC5leHRlbmQoe3R5cGU6XCJ0ZXh0XCIsXCJjbGFzc1wiOmNmZy5lZGl0YWJsZT09PXRydWU/XCJcIjpcIiBtcy1pbnB1dC1yZWFkb25seVwiLHJlYWRvbmx5OiFjZmcuZWRpdGFibGUscGxhY2Vob2xkZXI6Y2ZnLnBsYWNlaG9sZGVyLGRpc2FibGVkOmNmZy5kaXNhYmxlZH0sY2ZnLmlucHV0Q2ZnKSk7bXMuaW5wdXQuZm9jdXMoJC5wcm94eShoYW5kbGVycy5fb25JbnB1dEZvY3VzLHRoaXMpKTttcy5pbnB1dC5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vbklucHV0Q2xpY2ssdGhpcykpO21zLmNvbWJvYm94PSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtcmVzLWN0biBkcm9wZG93bi1tZW51XCJ9KS5oZWlnaHQoY2ZnLm1heERyb3BIZWlnaHQpO21zLmNvbWJvYm94Lm9uKFwiY2xpY2tcIixcImRpdi5tcy1yZXMtaXRlbVwiLCQucHJveHkoaGFuZGxlcnMuX29uQ29tYm9JdGVtU2VsZWN0ZWQsdGhpcykpO21zLmNvbWJvYm94Lm9uKFwibW91c2VvdmVyXCIsXCJkaXYubXMtcmVzLWl0ZW1cIiwkLnByb3h5KGhhbmRsZXJzLl9vbkNvbWJvSXRlbU1vdXNlT3Zlcix0aGlzKSk7aWYoY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7bXMuc2VsZWN0aW9uQ29udGFpbmVyPWNmZy5zZWxlY3Rpb25Db250YWluZXI7JChtcy5zZWxlY3Rpb25Db250YWluZXIpLmFkZENsYXNzKFwibXMtc2VsLWN0blwiKX1lbHNle21zLnNlbGVjdGlvbkNvbnRhaW5lcj0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXNlbC1jdG5cIn0pfW1zLnNlbGVjdGlvbkNvbnRhaW5lci5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vbkZvY3VzLHRoaXMpKTtpZihjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJiFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXttcy5zZWxlY3Rpb25Db250YWluZXIuYXBwZW5kKG1zLmlucHV0KX1lbHNle21zLmNvbnRhaW5lci5hcHBlbmQobXMuaW5wdXQpfW1zLmhlbHBlcj0kKFwiPHNwYW4vPlwiLHtcImNsYXNzXCI6XCJtcy1oZWxwZXIgXCIrY2ZnLmluZm9Nc2dDbHN9KTtzZWxmLl91cGRhdGVIZWxwZXIoKTttcy5jb250YWluZXIuYXBwZW5kKG1zLmhlbHBlcik7JChlbCkucmVwbGFjZVdpdGgobXMuY29udGFpbmVyKTtpZighY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7c3dpdGNoKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbil7Y2FzZVwiYm90dG9tXCI6bXMuc2VsZWN0aW9uQ29udGFpbmVyLmluc2VydEFmdGVyKG1zLmNvbnRhaW5lcik7aWYoY2ZnLnNlbGVjdGlvblN0YWNrZWQ9PT10cnVlKXttcy5zZWxlY3Rpb25Db250YWluZXIud2lkdGgobXMuY29udGFpbmVyLndpZHRoKCkpO21zLnNlbGVjdGlvbkNvbnRhaW5lci5hZGRDbGFzcyhcIm1zLXN0YWNrZWRcIil9YnJlYWs7Y2FzZVwicmlnaHRcIjptcy5zZWxlY3Rpb25Db250YWluZXIuaW5zZXJ0QWZ0ZXIobXMuY29udGFpbmVyKTttcy5jb250YWluZXIuY3NzKFwiZmxvYXRcIixcImxlZnRcIik7YnJlYWs7ZGVmYXVsdDptcy5jb250YWluZXIuYXBwZW5kKG1zLnNlbGVjdGlvbkNvbnRhaW5lcik7YnJlYWt9fWlmKGNmZy5oaWRlVHJpZ2dlcj09PWZhbHNlKXttcy50cmlnZ2VyPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtdHJpZ2dlclwiLGh0bWw6JzxkaXYgY2xhc3M9XCJtcy10cmlnZ2VyLWljb1wiPjwvZGl2Pid9KTttcy50cmlnZ2VyLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uVHJpZ2dlckNsaWNrLHRoaXMpKTttcy5jb250YWluZXIuYXBwZW5kKG1zLnRyaWdnZXIpfSQod2luZG93KS5yZXNpemUoJC5wcm94eShoYW5kbGVycy5fb25XaW5kb3dSZXNpemVkLHRoaXMpKTtpZihjZmcudmFsdWUhPT1udWxsfHxjZmcuZGF0YSE9PW51bGwpe2lmKHR5cGVvZiBjZmcuZGF0YT09PVwic3RyaW5nXCIpe3NlbGYuX2FzeW5jVmFsdWVzPWNmZy52YWx1ZTtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKX1lbHNle3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO2lmKGNmZy52YWx1ZSE9PW51bGwpe21zLnNldFZhbHVlKGNmZy52YWx1ZSk7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCl9fX0kKFwiYm9keVwiKS5jbGljayhmdW5jdGlvbihlKXtpZihtcy5jb250YWluZXIuaGFzQ2xhc3MoXCJtcy1jdG4tZm9jdXNcIikmJm1zLmNvbnRhaW5lci5oYXMoZS50YXJnZXQpLmxlbmd0aD09PTAmJmUudGFyZ2V0LmNsYXNzTmFtZS5pbmRleE9mKFwibXMtcmVzLWl0ZW1cIik8MCYmZS50YXJnZXQuY2xhc3NOYW1lLmluZGV4T2YoXCJtcy1jbG9zZS1idG5cIik8MCYmbXMuY29udGFpbmVyWzBdIT09ZS50YXJnZXQpe2hhbmRsZXJzLl9vbkJsdXIoKX19KTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXtjZmcuZXhwYW5kZWQ9ZmFsc2U7bXMuZXhwYW5kKCl9fSxfcmVuZGVyQ29tYm9JdGVtczpmdW5jdGlvbihpdGVtcyxpc0dyb3VwZWQpe3ZhciByZWY9dGhpcyxodG1sPVwiXCI7JC5lYWNoKGl0ZW1zLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXt2YXIgZGlzcGxheWVkPWNmZy5yZW5kZXJlciE9PW51bGw/Y2ZnLnJlbmRlcmVyLmNhbGwocmVmLHZhbHVlKTp2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXTt2YXIgZGlzYWJsZWQ9Y2ZnLmRpc2FibGVkRmllbGQhPT1udWxsJiZ2YWx1ZVtjZmcuZGlzYWJsZWRGaWVsZF09PT10cnVlO3ZhciByZXN1bHRJdGVtRWw9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1yZXMtaXRlbSBcIisoaXNHcm91cGVkP1wibXMtcmVzLWl0ZW0tZ3JvdXBlZCBcIjpcIlwiKSsoZGlzYWJsZWQ/XCJtcy1yZXMtaXRlbS1kaXNhYmxlZCBcIjpcIlwiKSsoaW5kZXglMj09PTEmJmNmZy51c2VaZWJyYVN0eWxlPT09dHJ1ZT9cIm1zLXJlcy1vZGRcIjpcIlwiKSxodG1sOmNmZy5oaWdobGlnaHQ9PT10cnVlP3NlbGYuX2hpZ2hsaWdodFN1Z2dlc3Rpb24oZGlzcGxheWVkKTpkaXNwbGF5ZWQsXCJkYXRhLWpzb25cIjpKU09OLnN0cmluZ2lmeSh2YWx1ZSl9KTtodG1sKz0kKFwiPGRpdi8+XCIpLmFwcGVuZChyZXN1bHRJdGVtRWwpLmh0bWwoKX0pO21zLmNvbWJvYm94LmFwcGVuZChodG1sKTtfY29tYm9JdGVtSGVpZ2h0PW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW06Zmlyc3RcIikub3V0ZXJIZWlnaHQoKX0sX3JlbmRlclNlbGVjdGlvbjpmdW5jdGlvbigpe3ZhciByZWY9dGhpcyx3PTAsaW5wdXRPZmZzZXQ9MCxpdGVtcz1bXSxhc1RleHQ9Y2ZnLnJlc3VsdEFzU3RyaW5nPT09dHJ1ZSYmIV9oYXNGb2N1czttcy5zZWxlY3Rpb25Db250YWluZXIuZmluZChcIi5tcy1zZWwtaXRlbVwiKS5yZW1vdmUoKTtpZihtcy5fdmFsdWVDb250YWluZXIhPT11bmRlZmluZWQpe21zLl92YWx1ZUNvbnRhaW5lci5yZW1vdmUoKX0kLmVhY2goX3NlbGVjdGlvbixmdW5jdGlvbihpbmRleCx2YWx1ZSl7dmFyIHNlbGVjdGVkSXRlbUVsLGRlbEl0ZW1FbCxzZWxlY3RlZEl0ZW1IdG1sPWNmZy5zZWxlY3Rpb25SZW5kZXJlciE9PW51bGw/Y2ZnLnNlbGVjdGlvblJlbmRlcmVyLmNhbGwocmVmLHZhbHVlKTp2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXTt2YXIgdmFsaWRDbHM9c2VsZi5fdmFsaWRhdGVTaW5nbGVJdGVtKHZhbHVlW2NmZy5kaXNwbGF5RmllbGRdKT9cIlwiOlwiIG1zLXNlbC1pbnZhbGlkXCI7aWYoYXNUZXh0PT09dHJ1ZSl7c2VsZWN0ZWRJdGVtRWw9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1zZWwtaXRlbSBtcy1zZWwtdGV4dCBcIitjZmcuc2VsZWN0aW9uQ2xzK3ZhbGlkQ2xzLGh0bWw6c2VsZWN0ZWRJdGVtSHRtbCsoaW5kZXg9PT1fc2VsZWN0aW9uLmxlbmd0aC0xP1wiXCI6Y2ZnLnJlc3VsdEFzU3RyaW5nRGVsaW1pdGVyKX0pLmRhdGEoXCJqc29uXCIsdmFsdWUpfWVsc2V7c2VsZWN0ZWRJdGVtRWw9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1zZWwtaXRlbSBcIitjZmcuc2VsZWN0aW9uQ2xzK3ZhbGlkQ2xzLGh0bWw6c2VsZWN0ZWRJdGVtSHRtbH0pLmRhdGEoXCJqc29uXCIsdmFsdWUpO2lmKGNmZy5kaXNhYmxlZD09PWZhbHNlKXtkZWxJdGVtRWw9JChcIjxzcGFuLz5cIix7XCJjbGFzc1wiOlwibXMtY2xvc2UtYnRuXCJ9KS5kYXRhKFwianNvblwiLHZhbHVlKS5hcHBlbmRUbyhzZWxlY3RlZEl0ZW1FbCk7ZGVsSXRlbUVsLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uVGFnVHJpZ2dlckNsaWNrLHJlZikpfX1pdGVtcy5wdXNoKHNlbGVjdGVkSXRlbUVsKX0pO21zLnNlbGVjdGlvbkNvbnRhaW5lci5wcmVwZW5kKGl0ZW1zKTttcy5fdmFsdWVDb250YWluZXI9JChcIjxkaXYvPlwiLHtzdHlsZTpcImRpc3BsYXk6IG5vbmU7XCJ9KTskLmVhY2gobXMuZ2V0VmFsdWUoKSxmdW5jdGlvbihpLHZhbCl7dmFyIGVsPSQoXCI8aW5wdXQvPlwiLHt0eXBlOlwiaGlkZGVuXCIsbmFtZTpjZmcubmFtZSx2YWx1ZTp2YWx9KTtlbC5hcHBlbmRUbyhtcy5fdmFsdWVDb250YWluZXIpfSk7bXMuX3ZhbHVlQ29udGFpbmVyLmFwcGVuZFRvKG1zLnNlbGVjdGlvbkNvbnRhaW5lcik7aWYoY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiJiYhY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7bXMuaW5wdXQud2lkdGgoMCk7aW5wdXRPZmZzZXQ9bXMuaW5wdXQub2Zmc2V0KCkubGVmdC1tcy5zZWxlY3Rpb25Db250YWluZXIub2Zmc2V0KCkubGVmdDt3PW1zLmNvbnRhaW5lci53aWR0aCgpLWlucHV0T2Zmc2V0LTQyO21zLmlucHV0LndpZHRoKHcpfWlmKF9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbil7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsX3NlbGVjdGlvbi5sZW5ndGgpKX1lbHNle21zLmhlbHBlci5oaWRlKCl9fSxfc2VsZWN0SXRlbTpmdW5jdGlvbihpdGVtKXtpZihjZmcubWF4U2VsZWN0aW9uPT09MSl7X3NlbGVjdGlvbj1bXX1tcy5hZGRUb1NlbGVjdGlvbihpdGVtLmRhdGEoXCJqc29uXCIpKTtpdGVtLnJlbW92ZUNsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpO2lmKGNmZy5leHBhbmRPbkZvY3VzPT09ZmFsc2V8fF9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbil7bXMuY29sbGFwc2UoKX1pZighX2hhc0ZvY3VzKXttcy5pbnB1dC5mb2N1cygpfWVsc2UgaWYoX2hhc0ZvY3VzJiYoY2ZnLmV4cGFuZE9uRm9jdXN8fF9jdHJsRG93bikpe3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO2lmKF9jdHJsRG93bil7bXMuZXhwYW5kKCl9fX0sX3NvcnRBbmRUcmltOmZ1bmN0aW9uKGRhdGEpe3ZhciBxPW1zLmdldFJhd1ZhbHVlKCksZmlsdGVyZWQ9W10sbmV3U3VnZ2VzdGlvbnM9W10sc2VsZWN0ZWRWYWx1ZXM9bXMuZ2V0VmFsdWUoKTtpZihxLmxlbmd0aD4wKXskLmVhY2goZGF0YSxmdW5jdGlvbihpbmRleCxvYmope3ZhciBuYW1lPW9ialtjZmcuZGlzcGxheUZpZWxkXTtpZihjZmcubWF0Y2hDYXNlPT09dHJ1ZSYmbmFtZS5pbmRleE9mKHEpPi0xfHxjZmcubWF0Y2hDYXNlPT09ZmFsc2UmJm5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHEudG9Mb3dlckNhc2UoKSk+LTEpe2lmKGNmZy5zdHJpY3RTdWdnZXN0PT09ZmFsc2V8fG5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHEudG9Mb3dlckNhc2UoKSk9PT0wKXtmaWx0ZXJlZC5wdXNoKG9iail9fX0pfWVsc2V7ZmlsdGVyZWQ9ZGF0YX0kLmVhY2goZmlsdGVyZWQsZnVuY3Rpb24oaW5kZXgsb2JqKXtpZihjZmcuYWxsb3dEdXBsaWNhdGVzfHwkLmluQXJyYXkob2JqW2NmZy52YWx1ZUZpZWxkXSxzZWxlY3RlZFZhbHVlcyk9PT0tMSl7bmV3U3VnZ2VzdGlvbnMucHVzaChvYmopfX0pO2lmKGNmZy5zb3J0T3JkZXIhPT1udWxsKXtuZXdTdWdnZXN0aW9ucy5zb3J0KGZ1bmN0aW9uKGEsYil7aWYoYVtjZmcuc29ydE9yZGVyXTxiW2NmZy5zb3J0T3JkZXJdKXtyZXR1cm4gY2ZnLnNvcnREaXI9PT1cImFzY1wiPy0xOjF9aWYoYVtjZmcuc29ydE9yZGVyXT5iW2NmZy5zb3J0T3JkZXJdKXtyZXR1cm4gY2ZnLnNvcnREaXI9PT1cImFzY1wiPzE6LTF9cmV0dXJuIDB9KX1pZihjZmcubWF4U3VnZ2VzdGlvbnMmJmNmZy5tYXhTdWdnZXN0aW9ucz4wKXtuZXdTdWdnZXN0aW9ucz1uZXdTdWdnZXN0aW9ucy5zbGljZSgwLGNmZy5tYXhTdWdnZXN0aW9ucyl9cmV0dXJuIG5ld1N1Z2dlc3Rpb25zfSxfZ3JvdXA6ZnVuY3Rpb24oZGF0YSl7aWYoY2ZnLmdyb3VwQnkhPT1udWxsKXtfZ3JvdXBzPXt9OyQuZWFjaChkYXRhLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXt2YXIgcHJvcHM9Y2ZnLmdyb3VwQnkuaW5kZXhPZihcIi5cIik+LTE/Y2ZnLmdyb3VwQnkuc3BsaXQoXCIuXCIpOmNmZy5ncm91cEJ5O3ZhciBwcm9wPXZhbHVlW2NmZy5ncm91cEJ5XTtpZih0eXBlb2YgcHJvcHMhPVwic3RyaW5nXCIpe3Byb3A9dmFsdWU7d2hpbGUocHJvcHMubGVuZ3RoPjApe3Byb3A9cHJvcFtwcm9wcy5zaGlmdCgpXX19aWYoX2dyb3Vwc1twcm9wXT09PXVuZGVmaW5lZCl7X2dyb3Vwc1twcm9wXT17dGl0bGU6cHJvcCxpdGVtczpbdmFsdWVdfX1lbHNle19ncm91cHNbcHJvcF0uaXRlbXMucHVzaCh2YWx1ZSl9fSl9cmV0dXJuIGRhdGF9LF91cGRhdGVIZWxwZXI6ZnVuY3Rpb24oaHRtbCl7bXMuaGVscGVyLmh0bWwoaHRtbCk7aWYoIW1zLmhlbHBlci5pcyhcIjp2aXNpYmxlXCIpKXttcy5oZWxwZXIuZmFkZUluKCl9fSxfdmFsaWRhdGVTaW5nbGVJdGVtOmZ1bmN0aW9uKHZhbHVlKXtpZihjZmcudnJlZ2V4IT09bnVsbCYmY2ZnLnZyZWdleCBpbnN0YW5jZW9mIFJlZ0V4cCl7cmV0dXJuIGNmZy52cmVnZXgudGVzdCh2YWx1ZSl9ZWxzZSBpZihjZmcudnR5cGUhPT1udWxsKXtzd2l0Y2goY2ZnLnZ0eXBlKXtjYXNlXCJhbHBoYVwiOnJldHVybi9eW2EtekEtWl9dKyQvLnRlc3QodmFsdWUpO2Nhc2VcImFscGhhbnVtXCI6cmV0dXJuL15bYS16QS1aMC05X10rJC8udGVzdCh2YWx1ZSk7Y2FzZVwiZW1haWxcIjpyZXR1cm4vXihcXHcrKShbXFwtKy5dW1xcd10rKSpAKFxcd1tcXC1cXHddKlxcLil7MSw1fShbQS1aYS16XSl7Miw2fSQvLnRlc3QodmFsdWUpO2Nhc2VcInVybFwiOnJldHVybi8oKCheaHR0cHM/KXwoXmZ0cCkpOlxcL1xcLyhbXFwtXFx3XStcXC4pK1xcd3syLDN9KFxcL1slXFwtXFx3XSsoXFwuXFx3ezIsfSk/KSooKFtcXHdcXC1cXC5cXD9cXFxcXFwvK0AmIztgfj0lIV0qKShcXC5cXHd7Mix9KT8pKlxcLz8pL2kudGVzdCh2YWx1ZSk7Y2FzZVwiaXBhZGRyZXNzXCI6cmV0dXJuL15cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfSQvLnRlc3QodmFsdWUpfX1yZXR1cm4gdHJ1ZX19O3ZhciBoYW5kbGVycz17X29uQmx1cjpmdW5jdGlvbigpe21zLmNvbnRhaW5lci5yZW1vdmVDbGFzcyhcIm1zLWN0bi1mb2N1c1wiKTttcy5jb2xsYXBzZSgpO19oYXNGb2N1cz1mYWxzZTtpZihtcy5nZXRSYXdWYWx1ZSgpIT09XCJcIiYmY2ZnLmFsbG93RnJlZUVudHJpZXM9PT10cnVlKXt2YXIgb2JqPXt9O29ialtjZmcuZGlzcGxheUZpZWxkXT1vYmpbY2ZnLnZhbHVlRmllbGRdPW1zLmdldFJhd1ZhbHVlKCkudHJpbSgpO21zLmFkZFRvU2VsZWN0aW9uKG9iail9c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7aWYobXMuaXNWYWxpZCgpPT09ZmFsc2Upe21zLmNvbnRhaW5lci5hZGRDbGFzcyhjZmcuaW52YWxpZENscyl9ZWxzZSBpZihtcy5pbnB1dC52YWwoKSE9PVwiXCImJmNmZy5hbGxvd0ZyZWVFbnRyaWVzPT09ZmFsc2Upe21zLmVtcHR5KCk7c2VsZi5fdXBkYXRlSGVscGVyKFwiXCIpfSQobXMpLnRyaWdnZXIoXCJibHVyXCIsW21zXSl9LF9vbkNvbWJvSXRlbU1vdXNlT3ZlcjpmdW5jdGlvbihlKXt2YXIgdGFyZ2V0PSQoZS5jdXJyZW50VGFyZ2V0KTtpZighdGFyZ2V0Lmhhc0NsYXNzKFwibXMtcmVzLWl0ZW0tZGlzYWJsZWRcIikpe21zLmNvbWJvYm94LmNoaWxkcmVuKCkucmVtb3ZlQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7dGFyZ2V0LmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpfX0sX29uQ29tYm9JdGVtU2VsZWN0ZWQ6ZnVuY3Rpb24oZSl7dmFyIHRhcmdldD0kKGUuY3VycmVudFRhcmdldCk7aWYoIXRhcmdldC5oYXNDbGFzcyhcIm1zLXJlcy1pdGVtLWRpc2FibGVkXCIpKXtzZWxmLl9zZWxlY3RJdGVtKCQoZS5jdXJyZW50VGFyZ2V0KSl9fSxfb25Gb2N1czpmdW5jdGlvbigpe21zLmlucHV0LmZvY3VzKCl9LF9vbklucHV0Q2xpY2s6ZnVuY3Rpb24oKXtpZihtcy5pc0Rpc2FibGVkKCk9PT1mYWxzZSYmX2hhc0ZvY3VzKXtpZihjZmcudG9nZ2xlT25DbGljaz09PXRydWUpe2lmKGNmZy5leHBhbmRlZCl7bXMuY29sbGFwc2UoKX1lbHNle21zLmV4cGFuZCgpfX19fSxfb25JbnB1dEZvY3VzOmZ1bmN0aW9uKCl7aWYobXMuaXNEaXNhYmxlZCgpPT09ZmFsc2UmJiFfaGFzRm9jdXMpe19oYXNGb2N1cz10cnVlO21zLmNvbnRhaW5lci5hZGRDbGFzcyhcIm1zLWN0bi1mb2N1c1wiKTttcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoY2ZnLmludmFsaWRDbHMpO3ZhciBjdXJMZW5ndGg9bXMuZ2V0UmF3VmFsdWUoKS5sZW5ndGg7aWYoY2ZnLmV4cGFuZE9uRm9jdXM9PT10cnVlKXttcy5leHBhbmQoKX1pZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLF9zZWxlY3Rpb24ubGVuZ3RoKSl9ZWxzZSBpZihjdXJMZW5ndGg8Y2ZnLm1pbkNoYXJzKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLGNmZy5taW5DaGFycy1jdXJMZW5ndGgpKX1zZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTskKG1zKS50cmlnZ2VyKFwiZm9jdXNcIixbbXNdKX19LF9vbktleURvd246ZnVuY3Rpb24oZSl7dmFyIGFjdGl2ZT1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdFwiKSxmcmVlSW5wdXQ9bXMuaW5wdXQudmFsKCk7JChtcykudHJpZ2dlcihcImtleWRvd25cIixbbXMsZV0pO2lmKGUua2V5Q29kZT09PUtFWUNPREVTLlRBQiYmKGNmZy51c2VUYWJLZXk9PT1mYWxzZXx8Y2ZnLnVzZVRhYktleT09PXRydWUmJmFjdGl2ZS5sZW5ndGg9PT0wJiZtcy5pbnB1dC52YWwoKS5sZW5ndGg9PT0wKSl7aGFuZGxlcnMuX29uQmx1cigpO3JldHVybn1zd2l0Y2goZS5rZXlDb2RlKXtjYXNlIEtFWUNPREVTLkJBQ0tTUEFDRTppZihmcmVlSW5wdXQubGVuZ3RoPT09MCYmbXMuZ2V0U2VsZWN0aW9uKCkubGVuZ3RoPjAmJmNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIil7X3NlbGVjdGlvbi5wb3AoKTtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTskKG1zKS50cmlnZ2VyKFwic2VsZWN0aW9uY2hhbmdlXCIsW21zLG1zLmdldFNlbGVjdGlvbigpXSk7bXMuaW5wdXQuYXR0cihcInBsYWNlaG9sZGVyXCIsY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiJiZtcy5nZXRWYWx1ZSgpLmxlbmd0aD4wP1wiXCI6Y2ZnLnBsYWNlaG9sZGVyKTttcy5pbnB1dC5mb2N1cygpO2UucHJldmVudERlZmF1bHQoKX1icmVhaztjYXNlIEtFWUNPREVTLlRBQjpjYXNlIEtFWUNPREVTLkVTQzplLnByZXZlbnREZWZhdWx0KCk7YnJlYWs7Y2FzZSBLRVlDT0RFUy5FTlRFUjppZihmcmVlSW5wdXQhPT1cIlwifHxjZmcuZXhwYW5kZWQpe2UucHJldmVudERlZmF1bHQoKX1icmVhaztjYXNlIEtFWUNPREVTLkNPTU1BOmlmKGNmZy51c2VDb21tYUtleT09PXRydWUpe2UucHJldmVudERlZmF1bHQoKX1icmVhaztjYXNlIEtFWUNPREVTLkNUUkw6X2N0cmxEb3duPXRydWU7YnJlYWs7Y2FzZSBLRVlDT0RFUy5ET1dOQVJST1c6ZS5wcmV2ZW50RGVmYXVsdCgpO3NlbGYuX21vdmVTZWxlY3RlZFJvdyhcImRvd25cIik7YnJlYWs7Y2FzZSBLRVlDT0RFUy5VUEFSUk9XOmUucHJldmVudERlZmF1bHQoKTtzZWxmLl9tb3ZlU2VsZWN0ZWRSb3coXCJ1cFwiKTticmVhaztkZWZhdWx0OmlmKF9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbil7ZS5wcmV2ZW50RGVmYXVsdCgpfWJyZWFrfX0sX29uS2V5VXA6ZnVuY3Rpb24oZSl7dmFyIGZyZWVJbnB1dD1tcy5nZXRSYXdWYWx1ZSgpLGlucHV0VmFsaWQ9JC50cmltKG1zLmlucHV0LnZhbCgpKS5sZW5ndGg+MCYmKCFjZmcubWF4RW50cnlMZW5ndGh8fCQudHJpbShtcy5pbnB1dC52YWwoKSkubGVuZ3RoPD1jZmcubWF4RW50cnlMZW5ndGgpLHNlbGVjdGVkLG9iaj17fTskKG1zKS50cmlnZ2VyKFwia2V5dXBcIixbbXMsZV0pO2NsZWFyVGltZW91dChfdGltZXIpO2lmKGUua2V5Q29kZT09PUtFWUNPREVTLkVTQyYmY2ZnLmV4cGFuZGVkKXttcy5jb21ib2JveC5oaWRlKCl9aWYoZS5rZXlDb2RlPT09S0VZQ09ERVMuVEFCJiZjZmcudXNlVGFiS2V5PT09ZmFsc2V8fGUua2V5Q29kZT5LRVlDT0RFUy5FTlRFUiYmZS5rZXlDb2RlPEtFWUNPREVTLlNQQUNFKXtpZihlLmtleUNvZGU9PT1LRVlDT0RFUy5DVFJMKXtfY3RybERvd249ZmFsc2V9cmV0dXJufXN3aXRjaChlLmtleUNvZGUpe2Nhc2UgS0VZQ09ERVMuVVBBUlJPVzpjYXNlIEtFWUNPREVTLkRPV05BUlJPVzplLnByZXZlbnREZWZhdWx0KCk7YnJlYWs7Y2FzZSBLRVlDT0RFUy5FTlRFUjpjYXNlIEtFWUNPREVTLlRBQjpjYXNlIEtFWUNPREVTLkNPTU1BOmlmKGUua2V5Q29kZSE9PUtFWUNPREVTLkNPTU1BfHxjZmcudXNlQ29tbWFLZXk9PT10cnVlKXtlLnByZXZlbnREZWZhdWx0KCk7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7c2VsZWN0ZWQ9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3RcIik7aWYoc2VsZWN0ZWQubGVuZ3RoPjApe3NlbGYuX3NlbGVjdEl0ZW0oc2VsZWN0ZWQpO3JldHVybn19aWYoaW5wdXRWYWxpZD09PXRydWUmJmNmZy5hbGxvd0ZyZWVFbnRyaWVzPT09dHJ1ZSl7b2JqW2NmZy5kaXNwbGF5RmllbGRdPW9ialtjZmcudmFsdWVGaWVsZF09ZnJlZUlucHV0LnRyaW0oKTttcy5hZGRUb1NlbGVjdGlvbihvYmopO21zLmNvbGxhcHNlKCk7bXMuaW5wdXQuZm9jdXMoKX1icmVha31kZWZhdWx0OmlmKF9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbil7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsX3NlbGVjdGlvbi5sZW5ndGgpKX1lbHNle2lmKGZyZWVJbnB1dC5sZW5ndGg8Y2ZnLm1pbkNoYXJzKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLGNmZy5taW5DaGFycy1mcmVlSW5wdXQubGVuZ3RoKSk7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7bXMuY29sbGFwc2UoKX19ZWxzZSBpZihjZmcubWF4RW50cnlMZW5ndGgmJmZyZWVJbnB1dC5sZW5ndGg+Y2ZnLm1heEVudHJ5TGVuZ3RoKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heEVudHJ5UmVuZGVyZXIuY2FsbCh0aGlzLGZyZWVJbnB1dC5sZW5ndGgtY2ZnLm1heEVudHJ5TGVuZ3RoKSk7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7bXMuY29sbGFwc2UoKX19ZWxzZXttcy5oZWxwZXIuaGlkZSgpO2lmKGNmZy5taW5DaGFyczw9ZnJlZUlucHV0Lmxlbmd0aCl7X3RpbWVyPXNldFRpbWVvdXQoZnVuY3Rpb24oKXtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKX1lbHNle21zLmV4cGFuZCgpfX0sY2ZnLnR5cGVEZWxheSl9fX1icmVha319LF9vblRhZ1RyaWdnZXJDbGljazpmdW5jdGlvbihlKXttcy5yZW1vdmVGcm9tU2VsZWN0aW9uKCQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKFwianNvblwiKSl9LF9vblRyaWdnZXJDbGljazpmdW5jdGlvbigpe2lmKG1zLmlzRGlzYWJsZWQoKT09PWZhbHNlJiYhKGNmZy5leHBhbmRPbkZvY3VzPT09dHJ1ZSYmX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKSl7JChtcykudHJpZ2dlcihcInRyaWdnZXJjbGlja1wiLFttc10pO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe21zLmNvbGxhcHNlKCl9ZWxzZXt2YXIgY3VyTGVuZ3RoPW1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO2lmKGN1ckxlbmd0aD49Y2ZnLm1pbkNoYXJzKXttcy5pbnB1dC5mb2N1cygpO21zLmV4cGFuZCgpfWVsc2V7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcyxjZmcubWluQ2hhcnMtY3VyTGVuZ3RoKSl9fX19LF9vbldpbmRvd1Jlc2l6ZWQ6ZnVuY3Rpb24oKXtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKX19O2lmKGVsZW1lbnQhPT1udWxsKXtzZWxmLl9yZW5kZXIoZWxlbWVudCl9fTskLmZuLm1hZ2ljU3VnZ2VzdD1mdW5jdGlvbihvcHRpb25zKXt2YXIgb2JqPSQodGhpcyk7aWYob2JqLnNpemUoKT09PTEmJm9iai5kYXRhKFwibWFnaWNTdWdnZXN0XCIpKXtyZXR1cm4gb2JqLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIil9b2JqLmVhY2goZnVuY3Rpb24oaSl7dmFyIGNudHI9JCh0aGlzKTtpZihjbnRyLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIikpe3JldHVybn1pZih0aGlzLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk9PT1cInNlbGVjdFwiKXtvcHRpb25zLmRhdGE9W107b3B0aW9ucy52YWx1ZT1bXTskLmVhY2godGhpcy5jaGlsZHJlbixmdW5jdGlvbihpbmRleCxjaGlsZCl7aWYoY2hpbGQubm9kZU5hbWUmJmNoaWxkLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk9PT1cIm9wdGlvblwiKXtvcHRpb25zLmRhdGEucHVzaCh7aWQ6Y2hpbGQudmFsdWUsbmFtZTpjaGlsZC50ZXh0fSk7aWYoJChjaGlsZCkuYXR0cihcInNlbGVjdGVkXCIpKXtvcHRpb25zLnZhbHVlLnB1c2goY2hpbGQudmFsdWUpfX19KX12YXIgZGVmPXt9OyQuZWFjaCh0aGlzLmF0dHJpYnV0ZXMsZnVuY3Rpb24oaSxhdHQpe2RlZlthdHQubmFtZV09YXR0Lm5hbWU9PT1cInZhbHVlXCImJmF0dC52YWx1ZSE9PVwiXCI/SlNPTi5wYXJzZShhdHQudmFsdWUpOmF0dC52YWx1ZX0pO3ZhciBmaWVsZD1uZXcgTWFnaWNTdWdnZXN0KHRoaXMsJC5leHRlbmQoW10sJC5mbi5tYWdpY1N1Z2dlc3QuZGVmYXVsdHMsb3B0aW9ucyxkZWYpKTtjbnRyLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIixmaWVsZCk7ZmllbGQuY29udGFpbmVyLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIixmaWVsZCl9KTtpZihvYmouc2l6ZSgpPT09MSl7cmV0dXJuIG9iai5kYXRhKFwibWFnaWNTdWdnZXN0XCIpfXJldHVybiBvYmp9OyQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzPXt9fSkoalF1ZXJ5KTsiLCIvKipcbiAqIE11bHRpcGxlIFNlbGVjdGlvbiBDb21wb25lbnQgZm9yIEJvb3RzdHJhcFxuICogQ2hlY2sgbmljb2xhc2JpemUuZ2l0aHViLmlvL21hZ2ljc3VnZ2VzdC8gZm9yIGxhdGVzdCB1cGRhdGVzLlxuICpcbiAqIEF1dGhvcjogICAgICAgTmljb2xhcyBCaXplXG4gKiBDcmVhdGVkOiAgICAgIEZlYiA4dGggMjAxM1xuICogTGFzdCBVcGRhdGVkOiBPY3QgMTZ0aCAyMDE0XG4gKiBWZXJzaW9uOiAgICAgIDIuMS40XG4gKiBMaWNlbmNlOiAgICAgIE1hZ2ljU3VnZ2VzdCBpcyBsaWNlbmNlZCB1bmRlciBNSVQgbGljZW5jZSAoaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVClcbiAqL1xuKGZ1bmN0aW9uKCQpXG57XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIE1hZ2ljU3VnZ2VzdCA9IGZ1bmN0aW9uKGVsZW1lbnQsIG9wdGlvbnMpXG4gICAge1xuICAgICAgICB2YXIgbXMgPSB0aGlzO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbml0aWFsaXplcyB0aGUgTWFnaWNTdWdnZXN0IGNvbXBvbmVudFxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgLyoqKioqKioqKiogIENPTkZJR1VSQVRJT04gUFJPUEVSVElFUyAqKioqKioqKioqKiovXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlc3RyaWN0cyBvciBhbGxvd3MgdGhlIHVzZXIgdG8gdmFsaWRhdGUgdHlwZWQgZW50cmllcy5cbiAgICAgICAgICAgICAqIERlZmF1bHRzIHRvIHRydWUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFsbG93RnJlZUVudHJpZXM6IHRydWUsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVzdHJpY3RzIG9yIGFsbG93cyB0aGUgdXNlciB0byBhZGQgdGhlIHNhbWUgZW50cnkgbW9yZSB0aGFuIG9uY2VcbiAgICAgICAgICAgICAqIERlZmF1bHRzIHRvIGZhbHNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhbGxvd0R1cGxpY2F0ZXM6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkZGl0aW9uYWwgY29uZmlnIG9iamVjdCBwYXNzZWQgdG8gZWFjaCAkLmFqYXggY2FsbFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhamF4Q29uZmlnOiB7fSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJZiBhIHNpbmdsZSBzdWdnZXN0aW9uIGNvbWVzIG91dCwgaXQgaXMgcHJlc2VsZWN0ZWQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGF1dG9TZWxlY3Q6IHRydWUsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQXV0byBzZWxlY3QgdGhlIGZpcnN0IG1hdGNoaW5nIGl0ZW0gd2l0aCBtdWx0aXBsZSBpdGVtcyBzaG93blxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZWxlY3RGaXJzdDogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWxsb3cgY3VzdG9taXphdGlvbiBvZiBxdWVyeSBwYXJhbWV0ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcXVlcnlQYXJhbTogJ3F1ZXJ5JyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHRyaWdnZXJlZCBqdXN0IGJlZm9yZSB0aGUgYWpheCByZXF1ZXN0IGlzIHNlbnQsIHNpbWlsYXIgdG8galF1ZXJ5XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCl7IH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBjdXN0b20gQ1NTIGNsYXNzIHRvIGFwcGx5IHRvIHRoZSBmaWVsZCdzIHVuZGVybHlpbmcgZWxlbWVudC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY2xzOiAnJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBKU09OIERhdGEgc291cmNlIHVzZWQgdG8gcG9wdWxhdGUgdGhlIGNvbWJvIGJveC4gMyBvcHRpb25zIGFyZSBhdmFpbGFibGUgaGVyZTpcbiAgICAgICAgICAgICAqIE5vIERhdGEgU291cmNlIChkZWZhdWx0KVxuICAgICAgICAgICAgICogICAgV2hlbiBsZWZ0IG51bGwsIHRoZSBjb21ibyBib3ggd2lsbCBub3Qgc3VnZ2VzdCBhbnl0aGluZy4gSXQgY2FuIHN0aWxsIGVuYWJsZSB0aGUgdXNlciB0byBlbnRlclxuICAgICAgICAgICAgICogICAgbXVsdGlwbGUgZW50cmllcyBpZiBhbGxvd0ZyZWVFbnRyaWVzIGlzICogc2V0IHRvIHRydWUgKGRlZmF1bHQpLlxuICAgICAgICAgICAgICogU3RhdGljIFNvdXJjZVxuICAgICAgICAgICAgICogICAgWW91IGNhbiBwYXNzIGFuIGFycmF5IG9mIEpTT04gb2JqZWN0cywgYW4gYXJyYXkgb2Ygc3RyaW5ncyBvciBldmVuIGEgc2luZ2xlIENTViBzdHJpbmcgYXMgdGhlXG4gICAgICAgICAgICAgKiAgICBkYXRhIHNvdXJjZS5Gb3IgZXguIGRhdGE6IFsqIHtpZDowLG5hbWU6XCJQYXJpc1wifSwge2lkOiAxLCBuYW1lOiBcIk5ldyBZb3JrXCJ9XVxuICAgICAgICAgICAgICogICAgWW91IGNhbiBhbHNvIHBhc3MgYW55IGpzb24gb2JqZWN0IHdpdGggdGhlIHJlc3VsdHMgcHJvcGVydHkgY29udGFpbmluZyB0aGUganNvbiBhcnJheS5cbiAgICAgICAgICAgICAqIFVybFxuICAgICAgICAgICAgICogICAgIFlvdSBjYW4gcGFzcyB0aGUgdXJsIGZyb20gd2hpY2ggdGhlIGNvbXBvbmVudCB3aWxsIGZldGNoIGl0cyBKU09OIGRhdGEuRGF0YSB3aWxsIGJlIGZldGNoZWRcbiAgICAgICAgICAgICAqICAgICB1c2luZyBhIFBPU1QgYWpheCByZXF1ZXN0IHRoYXQgd2lsbCAqIGluY2x1ZGUgdGhlIGVudGVyZWQgdGV4dCBhcyAncXVlcnknIHBhcmFtZXRlci4gVGhlIHJlc3VsdHNcbiAgICAgICAgICAgICAqICAgICBmZXRjaGVkIGZyb20gdGhlIHNlcnZlciBjYW4gYmU6XG4gICAgICAgICAgICAgKiAgICAgLSBhbiBhcnJheSBvZiBKU09OIG9iamVjdHMgKGV4OiBbe2lkOi4uLixuYW1lOi4uLn0sey4uLn1dKVxuICAgICAgICAgICAgICogICAgIC0gYSBzdHJpbmcgY29udGFpbmluZyBhbiBhcnJheSBvZiBKU09OIG9iamVjdHMgcmVhZHkgdG8gYmUgcGFyc2VkIChleDogXCJbe2lkOi4uLixuYW1lOi4uLn0sey4uLn1dXCIpXG4gICAgICAgICAgICAgKiAgICAgLSBhIEpTT04gb2JqZWN0IHdob3NlIGRhdGEgd2lsbCBiZSBjb250YWluZWQgaW4gdGhlIHJlc3VsdHMgcHJvcGVydHlcbiAgICAgICAgICAgICAqICAgICAgKGV4OiB7cmVzdWx0czogW3tpZDouLi4sbmFtZTouLi59LHsuLi59XVxuICAgICAgICAgICAgICogRnVuY3Rpb25cbiAgICAgICAgICAgICAqICAgICBZb3UgY2FuIHBhc3MgYSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFuIGFycmF5IG9mIEpTT04gb2JqZWN0cyAgKGV4OiBbe2lkOi4uLixuYW1lOi4uLn0sey4uLn1dKVxuICAgICAgICAgICAgICogICAgIFRoZSBmdW5jdGlvbiBjYW4gcmV0dXJuIHRoZSBKU09OIGRhdGEgb3IgaXQgY2FuIHVzZSB0aGUgZmlyc3QgYXJndW1lbnQgYXMgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSBkYXRhLlxuICAgICAgICAgICAgICogICAgIE9ubHkgb25lIChjYWxsYmFjayBmdW5jdGlvbiBvciByZXR1cm4gdmFsdWUpIGlzIG5lZWRlZCBmb3IgdGhlIGZ1bmN0aW9uIHRvIHN1Y2NlZWQuXG4gICAgICAgICAgICAgKiAgICAgU2VlIHRoZSBmb2xsb3dpbmcgZXhhbXBsZTpcbiAgICAgICAgICAgICAqICAgICBmdW5jdGlvbiAocmVzcG9uc2UpIHsgdmFyIG15anNvbiA9IFt7bmFtZTogJ3Rlc3QnLCBpZDogMX1dOyByZXNwb25zZShteWpzb24pOyByZXR1cm4gbXlqc29uOyB9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRhdGE6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWRkaXRpb25hbCBwYXJhbWV0ZXJzIHRvIHRoZSBhamF4IGNhbGxcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGF0YVVybFBhcmFtczoge30sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU3RhcnQgdGhlIGNvbXBvbmVudCBpbiBhIGRpc2FibGVkIHN0YXRlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkaXNhYmxlZDogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogTmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSB0aGF0IGRlZmluZXMgdGhlIGRpc2FibGVkIGJlaGF2aW91clxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkaXNhYmxlZEZpZWxkOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgZGlzcGxheWVkIGluIHRoZSBjb21ibyBsaXN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRpc3BsYXlGaWVsZDogJ25hbWUnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCB0byBmYWxzZSBpZiB5b3Ugb25seSB3YW50IG1vdXNlIGludGVyYWN0aW9uLiBJbiB0aGF0IGNhc2UgdGhlIGNvbWJvIHdpbGxcbiAgICAgICAgICAgICAqIGF1dG9tYXRpY2FsbHkgZXhwYW5kIG9uIGZvY3VzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBlZGl0YWJsZTogdHJ1ZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgc3RhcnRpbmcgc3RhdGUgZm9yIGNvbWJvLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBleHBhbmRlZDogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQXV0b21hdGljYWxseSBleHBhbmRzIGNvbWJvIG9uIGZvY3VzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBleHBhbmRPbkZvY3VzOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBKU09OIHByb3BlcnR5IGJ5IHdoaWNoIHRoZSBsaXN0IHNob3VsZCBiZSBncm91cGVkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGdyb3VwQnk6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gaGlkZSB0aGUgdHJpZ2dlciBvbiB0aGUgcmlnaHRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaGlkZVRyaWdnZXI6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIGhpZ2hsaWdodCBzZWFyY2ggaW5wdXQgd2l0aGluIGRpc3BsYXllZCBzdWdnZXN0aW9uc1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBoaWdobGlnaHQ6IHRydWUsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBjdXN0b20gSUQgZm9yIHRoaXMgY29tcG9uZW50XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlkOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgY2xhc3MgdGhhdCBpcyBhZGRlZCB0byB0aGUgaW5mbyBtZXNzYWdlIGFwcGVhcmluZyBvbiB0aGUgdG9wLXJpZ2h0IHBhcnQgb2YgdGhlIGNvbXBvbmVudFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbmZvTXNnQ2xzOiAnJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgcGFzc2VkIG91dCB0byB0aGUgSU5QVVQgdGFnLiBFbmFibGVzIHVzYWdlIG9mIEFuZ3VsYXJKUydzIGN1c3RvbSB0YWdzIGZvciBleC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW5wdXRDZmc6IHt9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBjbGFzcyB0aGF0IGlzIGFwcGxpZWQgdG8gc2hvdyB0aGF0IHRoZSBmaWVsZCBpcyBpbnZhbGlkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGludmFsaWRDbHM6ICdtcy1pbnYnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIGZpbHRlciBkYXRhIHJlc3VsdHMgYWNjb3JkaW5nIHRvIGNhc2UuIFVzZWxlc3MgaWYgdGhlIGRhdGEgaXMgZmV0Y2hlZCByZW1vdGVseVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXRjaENhc2U6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE9uY2UgZXhwYW5kZWQsIHRoZSBjb21ibydzIGhlaWdodCB3aWxsIHRha2UgYXMgbXVjaCByb29tIGFzIHRoZSAjIG9mIGF2YWlsYWJsZSByZXN1bHRzLlxuICAgICAgICAgICAgICogICAgSW4gY2FzZSB0aGVyZSBhcmUgdG9vIG1hbnkgcmVzdWx0cyBkaXNwbGF5ZWQsIHRoaXMgd2lsbCBmaXggdGhlIGRyb3AgZG93biBoZWlnaHQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heERyb3BIZWlnaHQ6IDI5MCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWZpbmVzIGhvdyBsb25nIHRoZSB1c2VyIGZyZWUgZW50cnkgY2FuIGJlLiBTZXQgdG8gbnVsbCBmb3Igbm8gbGltaXQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heEVudHJ5TGVuZ3RoOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIHRoZSBoZWxwZXIgdGV4dCB3aGVuIHRoZSBtYXggZW50cnkgbGVuZ3RoIGhhcyBiZWVuIHN1cnBhc3NlZC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWF4RW50cnlSZW5kZXJlcjogZnVuY3Rpb24odikge1xuICAgICAgICAgICAgICAgIHJldHVybiAnUGxlYXNlIHJlZHVjZSB5b3VyIGVudHJ5IGJ5ICcgKyB2ICsgJyBjaGFyYWN0ZXInICsgKHYgPiAxID8gJ3MnOicnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIG1heGltdW0gbnVtYmVyIG9mIHJlc3VsdHMgZGlzcGxheWVkIGluIHRoZSBjb21ibyBkcm9wIGRvd24gYXQgb25jZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWF4U3VnZ2VzdGlvbnM6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIG1heGltdW0gbnVtYmVyIG9mIGl0ZW1zIHRoZSB1c2VyIGNhbiBzZWxlY3QgaWYgbXVsdGlwbGUgc2VsZWN0aW9uIGlzIGFsbG93ZWQuXG4gICAgICAgICAgICAgKiAgICBTZXQgdG8gbnVsbCB0byByZW1vdmUgdGhlIGxpbWl0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXhTZWxlY3Rpb246IDEwLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIHRoZSBoZWxwZXIgdGV4dCB3aGVuIHRoZSBtYXggc2VsZWN0aW9uIGFtb3VudCBoYXMgYmVlbiByZWFjaGVkLiBUaGUgZnVuY3Rpb24gaGFzIGEgc2luZ2xlXG4gICAgICAgICAgICAgKiAgICBwYXJhbWV0ZXIgd2hpY2ggaXMgdGhlIG51bWJlciBvZiBzZWxlY3RlZCBlbGVtZW50cy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWF4U2VsZWN0aW9uUmVuZGVyZXI6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1lvdSBjYW5ub3QgY2hvb3NlIG1vcmUgdGhhbiAnICsgdiArICcgaXRlbScgKyAodiA+IDEgPyAncyc6JycpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgbWV0aG9kIHVzZWQgYnkgdGhlIGFqYXggcmVxdWVzdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIG1pbmltdW0gbnVtYmVyIG9mIGNoYXJhY3RlcnMgdGhlIHVzZXIgbXVzdCB0eXBlIGJlZm9yZSB0aGUgY29tYm8gZXhwYW5kcyBhbmQgb2ZmZXJzIHN1Z2dlc3Rpb25zLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtaW5DaGFyczogMCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyB0aGUgaGVscGVyIHRleHQgd2hlbiBub3QgZW5vdWdoIGxldHRlcnMgYXJlIHNldC4gVGhlIGZ1bmN0aW9uIGhhcyBhIHNpbmdsZVxuICAgICAgICAgICAgICogICAgcGFyYW1ldGVyIHdoaWNoIGlzIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gdGhlIHJlcXVpcmVkIGFtb3VudCBvZiBsZXR0ZXJzIGFuZCB0aGUgY3VycmVudCBvbmUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1pbkNoYXJzUmVuZGVyZXI6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1BsZWFzZSB0eXBlICcgKyB2ICsgJyBtb3JlIGNoYXJhY3RlcicgKyAodiA+IDEgPyAncyc6JycpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBXaGV0aGVyIG9yIG5vdCBzb3J0aW5nIC8gZmlsdGVyaW5nIHNob3VsZCBiZSBkb25lIHJlbW90ZWx5IG9yIGxvY2FsbHkuXG4gICAgICAgICAgICAgKiBVc2UgZWl0aGVyICdsb2NhbCcgb3IgJ3JlbW90ZSdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbW9kZTogJ2xvY2FsJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgbmFtZSB1c2VkIGFzIGEgZm9ybSBlbGVtZW50LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBuYW1lOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSB0ZXh0IGRpc3BsYXllZCB3aGVuIHRoZXJlIGFyZSBubyBzdWdnZXN0aW9ucy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbm9TdWdnZXN0aW9uVGV4dDogJ05vIHN1Z2dlc3Rpb25zJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgZGVmYXVsdCBwbGFjZWhvbGRlciB0ZXh0IHdoZW4gbm90aGluZyBoYXMgYmVlbiBlbnRlcmVkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnVHlwZSBvciBjbGljayBoZXJlJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHVzZWQgdG8gZGVmaW5lIGhvdyB0aGUgaXRlbXMgd2lsbCBiZSBwcmVzZW50ZWQgaW4gdGhlIGNvbWJvXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlbmRlcmVyOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFdoZXRoZXIgb3Igbm90IHRoaXMgZmllbGQgc2hvdWxkIGJlIHJlcXVpcmVkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byByZW5kZXIgc2VsZWN0aW9uIGFzIGEgZGVsaW1pdGVkIHN0cmluZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXN1bHRBc1N0cmluZzogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGV4dCBkZWxpbWl0ZXIgdG8gdXNlIGluIGEgZGVsaW1pdGVkIHN0cmluZy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVzdWx0QXNTdHJpbmdEZWxpbWl0ZXI6ICcsJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBOYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IHRoYXQgcmVwcmVzZW50cyB0aGUgbGlzdCBvZiBzdWdnZXN0ZWQgb2JqZWN0c1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXN1bHRzRmllbGQ6ICdyZXN1bHRzJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGN1c3RvbSBDU1MgY2xhc3MgdG8gYWRkIHRvIGEgc2VsZWN0ZWQgaXRlbVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZWxlY3Rpb25DbHM6ICcnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFuIG9wdGlvbmFsIGVsZW1lbnQgcmVwbGFjZW1lbnQgaW4gd2hpY2ggdGhlIHNlbGVjdGlvbiBpcyByZW5kZXJlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZWxlY3Rpb25Db250YWluZXI6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogV2hlcmUgdGhlIHNlbGVjdGVkIGl0ZW1zIHdpbGwgYmUgZGlzcGxheWVkLiBPbmx5ICdyaWdodCcsICdib3R0b20nIGFuZCAnaW5uZXInIGFyZSB2YWxpZCB2YWx1ZXNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0aW9uUG9zaXRpb246ICdpbm5lcicsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB1c2VkIHRvIGRlZmluZSBob3cgdGhlIGl0ZW1zIHdpbGwgYmUgcHJlc2VudGVkIGluIHRoZSB0YWcgbGlzdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZWxlY3Rpb25SZW5kZXJlcjogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byBzdGFjayB0aGUgc2VsZWN0aW9uZWQgaXRlbXMgd2hlbiBwb3NpdGlvbmVkIG9uIHRoZSBib3R0b21cbiAgICAgICAgICAgICAqICAgIFJlcXVpcmVzIHRoZSBzZWxlY3Rpb25Qb3NpdGlvbiB0byBiZSBzZXQgdG8gJ2JvdHRvbSdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0aW9uU3RhY2tlZDogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGlyZWN0aW9uIHVzZWQgZm9yIHNvcnRpbmcuIE9ubHkgJ2FzYycgYW5kICdkZXNjJyBhcmUgdmFsaWQgdmFsdWVzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNvcnREaXI6ICdhc2MnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIG5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgZm9yIGxvY2FsIHJlc3VsdCBzb3J0aW5nLlxuICAgICAgICAgICAgICogICAgTGVhdmUgbnVsbCBpZiB5b3UgZG8gbm90IHdpc2ggdGhlIHJlc3VsdHMgdG8gYmUgb3JkZXJlZCBvciBpZiB0aGV5IGFyZSBhbHJlYWR5IG9yZGVyZWQgcmVtb3RlbHkuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNvcnRPcmRlcjogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJZiBzZXQgdG8gdHJ1ZSwgc3VnZ2VzdGlvbnMgd2lsbCBoYXZlIHRvIHN0YXJ0IGJ5IHVzZXIgaW5wdXQgKGFuZCBub3Qgc2ltcGx5IGNvbnRhaW4gaXQgYXMgYSBzdWJzdHJpbmcpXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHN0cmljdFN1Z2dlc3Q6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEN1c3RvbSBzdHlsZSBhZGRlZCB0byB0aGUgY29tcG9uZW50IGNvbnRhaW5lci5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc3R5bGU6ICcnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIElmIHNldCB0byB0cnVlLCB0aGUgY29tYm8gd2lsbCBleHBhbmQgLyBjb2xsYXBzZSB3aGVuIGNsaWNrZWQgdXBvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0b2dnbGVPbkNsaWNrOiBmYWxzZSxcblxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFtb3VudCAoaW4gbXMpIGJldHdlZW4ga2V5Ym9hcmQgcmVnaXN0ZXJzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0eXBlRGVsYXk6IDQwMCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJZiBzZXQgdG8gdHJ1ZSwgdGFiIHdvbid0IGJsdXIgdGhlIGNvbXBvbmVudCBidXQgd2lsbCBiZSByZWdpc3RlcmVkIGFzIHRoZSBFTlRFUiBrZXlcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdXNlVGFiS2V5OiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJZiBzZXQgdG8gdHJ1ZSwgdXNpbmcgY29tbWEgd2lsbCB2YWxpZGF0ZSB0aGUgdXNlcidzIGNob2ljZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB1c2VDb21tYUtleTogdHJ1ZSxcblxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERldGVybWluZXMgd2hldGhlciBvciBub3QgdGhlIHJlc3VsdHMgd2lsbCBiZSBkaXNwbGF5ZWQgd2l0aCBhIHplYnJhIHRhYmxlIHN0eWxlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHVzZVplYnJhU3R5bGU6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIGluaXRpYWwgdmFsdWUgZm9yIHRoZSBmaWVsZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB2YWx1ZTogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBuYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IHRoYXQgcmVwcmVzZW50cyBpdHMgdW5kZXJseWluZyB2YWx1ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB2YWx1ZUZpZWxkOiAnaWQnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byB2YWxpZGF0ZSB0aGUgdmFsdWVzIGFnYWluc3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdnJlZ2V4OiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIHR5cGUgdG8gdmFsaWRhdGUgYWdhaW5zdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB2dHlwZTogbnVsbFxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBjb25mID0gJC5leHRlbmQoe30sb3B0aW9ucyk7XG4gICAgICAgIHZhciBjZmcgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIGNvbmYpO1xuXG4gICAgICAgIC8qKioqKioqKioqICBQVUJMSUMgTUVUSE9EUyAqKioqKioqKioqKiovXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGQgb25lIG9yIG11bHRpcGxlIGpzb24gaXRlbXMgdG8gdGhlIGN1cnJlbnQgc2VsZWN0aW9uXG4gICAgICAgICAqIEBwYXJhbSBpdGVtcyAtIGpzb24gb2JqZWN0IG9yIGFycmF5IG9mIGpzb24gb2JqZWN0c1xuICAgICAgICAgKiBAcGFyYW0gaXNTaWxlbnQgLSAob3B0aW9uYWwpIHNldCB0byB0cnVlIHRvIHN1cHByZXNzICdzZWxlY3Rpb25jaGFuZ2UnIGV2ZW50IGZyb20gYmVpbmcgdHJpZ2dlcmVkXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmFkZFRvU2VsZWN0aW9uID0gZnVuY3Rpb24oaXRlbXMsIGlzU2lsZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoIWNmZy5tYXhTZWxlY3Rpb24gfHwgX3NlbGVjdGlvbi5sZW5ndGggPCBjZmcubWF4U2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEkLmlzQXJyYXkoaXRlbXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zID0gW2l0ZW1zXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICQuZWFjaChpdGVtcywgZnVuY3Rpb24oaW5kZXgsIGpzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNmZy5hbGxvd0R1cGxpY2F0ZXMgfHwgJC5pbkFycmF5KGpzb25bY2ZnLnZhbHVlRmllbGRdLCBtcy5nZXRWYWx1ZSgpKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9zZWxlY3Rpb24ucHVzaChqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZih2YWx1ZWNoYW5nZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1wdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzU2lsZW50ICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ3NlbGVjdGlvbmNoYW5nZScsIFt0aGlzLCB0aGlzLmdldFNlbGVjdGlvbigpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmlucHV0LmF0dHIoJ3BsYWNlaG9sZGVyJywgKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiB0aGlzLmdldFZhbHVlKCkubGVuZ3RoID4gMCkgPyAnJyA6IGNmZy5wbGFjZWhvbGRlcik7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENsZWFycyB0aGUgY3VycmVudCBzZWxlY3Rpb25cbiAgICAgICAgICogQHBhcmFtIGlzU2lsZW50IC0gKG9wdGlvbmFsKSBzZXQgdG8gdHJ1ZSB0byBzdXBwcmVzcyAnc2VsZWN0aW9uY2hhbmdlJyBldmVudCBmcm9tIGJlaW5nIHRyaWdnZXJlZFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jbGVhciA9IGZ1bmN0aW9uKGlzU2lsZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUZyb21TZWxlY3Rpb24oX3NlbGVjdGlvbi5zbGljZSgwKSwgaXNTaWxlbnQpOyAvLyBjbG9uZSBhcnJheSB0byBhdm9pZCBjb25jdXJyZW5jeSBpc3N1ZXNcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29sbGFwc2UgdGhlIGRyb3AgZG93biBwYXJ0IG9mIHRoZSBjb21ib1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jb2xsYXBzZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29tYm9ib3guZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgY2ZnLmV4cGFuZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdjb2xsYXBzZScsIFt0aGlzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldCB0aGUgY29tcG9uZW50IGluIGEgZGlzYWJsZWQgc3RhdGUuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmRpc2FibGUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLmFkZENsYXNzKCdtcy1jdG4tZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNmZy5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICBtcy5pbnB1dC5hdHRyKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbXB0aWVzIG91dCB0aGUgY29tYm8gdXNlciB0ZXh0XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtcHR5ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMuaW5wdXQudmFsKCcnKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IHRoZSBjb21wb25lbnQgaW4gYSBlbmFibGUgc3RhdGUuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVuYWJsZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgdGhpcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoJ21zLWN0bi1kaXNhYmxlZCcpO1xuICAgICAgICAgICAgY2ZnLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICBtcy5pbnB1dC5hdHRyKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXhwYW5kIHRoZSBkcm9wIGRyb3duIHBhcnQgb2YgdGhlIGNvbWJvLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5leHBhbmQgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICghY2ZnLmV4cGFuZGVkICYmICh0aGlzLmlucHV0LnZhbCgpLmxlbmd0aCA+PSBjZmcubWluQ2hhcnMgfHwgdGhpcy5jb21ib2JveC5jaGlsZHJlbigpLnNpemUoKSA+IDApKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21ib2JveC5hcHBlbmRUbyh0aGlzLmNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgY2ZnLmV4cGFuZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ2V4cGFuZCcsIFt0aGlzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlIGNvbXBvbmVudCBlbmFibGVkIHN0YXR1c1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc0Rpc2FibGVkID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gY2ZnLmRpc2FibGVkO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDaGVja3Mgd2hldGhlciB0aGUgZmllbGQgaXMgdmFsaWQgb3Igbm90XG4gICAgICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmlzVmFsaWQgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciB2YWxpZCA9IGNmZy5yZXF1aXJlZCA9PT0gZmFsc2UgfHwgX3NlbGVjdGlvbi5sZW5ndGggPiAwO1xuICAgICAgICAgICAgaWYoY2ZnLnZ0eXBlIHx8IGNmZy52cmVnZXgpe1xuICAgICAgICAgICAgICAgICQuZWFjaChfc2VsZWN0aW9uLCBmdW5jdGlvbihpbmRleCwgaXRlbSl7XG4gICAgICAgICAgICAgICAgICAgIHZhbGlkID0gdmFsaWQgJiYgc2VsZi5fdmFsaWRhdGVTaW5nbGVJdGVtKGl0ZW1bY2ZnLnZhbHVlRmllbGRdKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2YWxpZDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogR2V0cyB0aGUgZGF0YSBwYXJhbXMgZm9yIGN1cnJlbnQgYWpheCByZXF1ZXN0XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldERhdGFVcmxQYXJhbXMgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiBjZmcuZGF0YVVybFBhcmFtcztcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogR2V0cyB0aGUgbmFtZSBnaXZlbiB0byB0aGUgZm9ybSBpbnB1dFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXROYW1lID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gY2ZnLm5hbWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlIGFuIGFycmF5IG9mIHNlbGVjdGVkIGpzb24gb2JqZWN0c1xuICAgICAgICAgKiBAcmV0dXJuIHtBcnJheX1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0U2VsZWN0aW9uID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gX3NlbGVjdGlvbjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0cmlldmUgdGhlIGN1cnJlbnQgdGV4dCBlbnRlcmVkIGJ5IHRoZSB1c2VyXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldFJhd1ZhbHVlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHJldHVybiBtcy5pbnB1dC52YWwoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0cmlldmUgYW4gYXJyYXkgb2Ygc2VsZWN0ZWQgdmFsdWVzXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldFZhbHVlID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gJC5tYXAoX3NlbGVjdGlvbiwgZnVuY3Rpb24obykge1xuICAgICAgICAgICAgICAgIHJldHVybiBvW2NmZy52YWx1ZUZpZWxkXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmUgb25lIG9yIG11bHRpcGxlcyBqc29uIGl0ZW1zIGZyb20gdGhlIGN1cnJlbnQgc2VsZWN0aW9uXG4gICAgICAgICAqIEBwYXJhbSBpdGVtcyAtIGpzb24gb2JqZWN0IG9yIGFycmF5IG9mIGpzb24gb2JqZWN0c1xuICAgICAgICAgKiBAcGFyYW0gaXNTaWxlbnQgLSAob3B0aW9uYWwpIHNldCB0byB0cnVlIHRvIHN1cHByZXNzICdzZWxlY3Rpb25jaGFuZ2UnIGV2ZW50IGZyb20gYmVpbmcgdHJpZ2dlcmVkXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnJlbW92ZUZyb21TZWxlY3Rpb24gPSBmdW5jdGlvbihpdGVtcywgaXNTaWxlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICghJC5pc0FycmF5KGl0ZW1zKSkge1xuICAgICAgICAgICAgICAgIGl0ZW1zID0gW2l0ZW1zXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB2YWx1ZWNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICQuZWFjaChpdGVtcywgZnVuY3Rpb24oaW5kZXgsIGpzb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgaSA9ICQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSwgbXMuZ2V0VmFsdWUoKSk7XG4gICAgICAgICAgICAgICAgaWYgKGkgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICBfc2VsZWN0aW9uLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICh2YWx1ZWNoYW5nZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICBpZihpc1NpbGVudCAhPT0gdHJ1ZSl7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykudHJpZ2dlcignc2VsZWN0aW9uY2hhbmdlJywgW3RoaXMsIHRoaXMuZ2V0U2VsZWN0aW9uKCldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZE9uRm9jdXMpe1xuICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaW5wdXQuYXR0cigncGxhY2Vob2xkZXInLCAoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmIHRoaXMuZ2V0VmFsdWUoKS5sZW5ndGggPiAwKSA/ICcnIDogY2ZnLnBsYWNlaG9sZGVyKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogR2V0IGN1cnJlbnQgZGF0YVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXREYXRhID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHJldHVybiBfY2JEYXRhO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXQgdXAgc29tZSBjb21ibyBkYXRhIGFmdGVyIGl0IGhhcyBiZWVuIHJlbmRlcmVkXG4gICAgICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIGNmZy5kYXRhID0gZGF0YTtcbiAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIHRoZSBuYW1lIGZvciB0aGUgaW5wdXQgZmllbGQgc28gaXQgY2FuIGJlIGZldGNoZWQgaW4gdGhlIGZvcm1cbiAgICAgICAgICogQHBhcmFtIG5hbWVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2V0TmFtZSA9IGZ1bmN0aW9uKG5hbWUpe1xuICAgICAgICAgICAgY2ZnLm5hbWUgPSBuYW1lO1xuICAgICAgICAgICAgaWYobmFtZSl7XG4gICAgICAgICAgICAgICAgY2ZnLm5hbWUgKz0gbmFtZS5pbmRleE9mKCdbXScpID4gMCA/ICcnIDogJ1tdJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKG1zLl92YWx1ZUNvbnRhaW5lcil7XG4gICAgICAgICAgICAgICAgJC5lYWNoKG1zLl92YWx1ZUNvbnRhaW5lci5jaGlsZHJlbigpLCBmdW5jdGlvbihpLCBlbCl7XG4gICAgICAgICAgICAgICAgICAgIGVsLm5hbWUgPSBjZmcubmFtZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0cyB0aGUgY3VycmVudCBzZWxlY3Rpb24gd2l0aCB0aGUgSlNPTiBpdGVtcyBwcm92aWRlZFxuICAgICAgICAgKiBAcGFyYW0gaXRlbXNcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2V0U2VsZWN0aW9uID0gZnVuY3Rpb24oaXRlbXMpe1xuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5hZGRUb1NlbGVjdGlvbihpdGVtcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldHMgYSB2YWx1ZSBmb3IgdGhlIGNvbWJvIGJveC4gVmFsdWUgbXVzdCBiZSBhbiBhcnJheSBvZiB2YWx1ZXMgd2l0aCBkYXRhIHR5cGUgbWF0Y2hpbmcgdmFsdWVGaWVsZCBvbmUuXG4gICAgICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNldFZhbHVlID0gZnVuY3Rpb24odmFsdWVzKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgaXRlbXMgPSBbXTtcblxuICAgICAgICAgICAgJC5lYWNoKHZhbHVlcywgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gZmlyc3QgdHJ5IHRvIHNlZSBpZiB3ZSBoYXZlIHRoZSBmdWxsIG9iamVjdHMgZnJvbSBvdXIgZGF0YSBzZXRcbiAgICAgICAgICAgICAgICB2YXIgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAkLmVhY2goX2NiRGF0YSwgZnVuY3Rpb24oaSxpdGVtKXtcbiAgICAgICAgICAgICAgICAgICAgaWYoaXRlbVtjZmcudmFsdWVGaWVsZF0gPT0gdmFsdWUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmKCFmb3VuZCl7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZih2YWx1ZSkgPT09ICdvYmplY3QnKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGpzb24gPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25bY2ZnLnZhbHVlRmllbGRdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uW2NmZy5kaXNwbGF5RmllbGRdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKGpzb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZihpdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRUb1NlbGVjdGlvbihpdGVtcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldHMgZGF0YSBwYXJhbXMgZm9yIHN1YnNlcXVlbnQgYWpheCByZXF1ZXN0c1xuICAgICAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNldERhdGFVcmxQYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNmZy5kYXRhVXJsUGFyYW1zID0gJC5leHRlbmQoe30scGFyYW1zKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKioqKioqKioqKiAgUFJJVkFURSAqKioqKioqKioqKiovXG4gICAgICAgIHZhciBfc2VsZWN0aW9uID0gW10sICAgICAgLy8gc2VsZWN0ZWQgb2JqZWN0c1xuICAgICAgICAgICAgX2NvbWJvSXRlbUhlaWdodCA9IDAsIC8vIGhlaWdodCBmb3IgZWFjaCBjb21ibyBpdGVtLlxuICAgICAgICAgICAgX3RpbWVyLFxuICAgICAgICAgICAgX2hhc0ZvY3VzID0gZmFsc2UsXG4gICAgICAgICAgICBfZ3JvdXBzID0gbnVsbCxcbiAgICAgICAgICAgIF9jYkRhdGEgPSBbXSxcbiAgICAgICAgICAgIF9jdHJsRG93biA9IGZhbHNlLFxuICAgICAgICAgICAgS0VZQ09ERVMgPSB7XG4gICAgICAgICAgICAgICAgQkFDS1NQQUNFOiA4LFxuICAgICAgICAgICAgICAgIFRBQjogOSxcbiAgICAgICAgICAgICAgICBFTlRFUjogMTMsXG4gICAgICAgICAgICAgICAgQ1RSTDogMTcsXG4gICAgICAgICAgICAgICAgRVNDOiAyNyxcbiAgICAgICAgICAgICAgICBTUEFDRTogMzIsXG4gICAgICAgICAgICAgICAgVVBBUlJPVzogMzgsXG4gICAgICAgICAgICAgICAgRE9XTkFSUk9XOiA0MCxcbiAgICAgICAgICAgICAgICBDT01NQTogMTg4XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzZWxmID0ge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVtcHRpZXMgdGhlIHJlc3VsdCBjb250YWluZXIgYW5kIHJlZmlsbHMgaXQgd2l0aCB0aGUgYXJyYXkgb2YganNvbiByZXN1bHRzIGluIGlucHV0XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfZGlzcGxheVN1Z2dlc3Rpb25zOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2hvdygpO1xuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmVtcHR5KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcmVzSGVpZ2h0ID0gMCwgLy8gdG90YWwgaGVpZ2h0IHRha2VuIGJ5IGRpc3BsYXllZCByZXN1bHRzLlxuICAgICAgICAgICAgICAgICAgICBuYkdyb3VwcyA9IDA7XG5cbiAgICAgICAgICAgICAgICBpZihfZ3JvdXBzID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlckNvbWJvSXRlbXMoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHJlc0hlaWdodCA9IF9jb21ib0l0ZW1IZWlnaHQgKiBkYXRhLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgZ3JwTmFtZSBpbiBfZ3JvdXBzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYkdyb3VwcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1yZXMtZ3JvdXAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IGdycE5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmFwcGVuZFRvKG1zLmNvbWJvYm94KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlckNvbWJvSXRlbXMoX2dyb3Vwc1tncnBOYW1lXS5pdGVtcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIF9ncm91cEl0ZW1IZWlnaHQgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWdyb3VwJykub3V0ZXJIZWlnaHQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoX2dyb3VwSXRlbUhlaWdodCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgIHZhciB0bXBSZXNIZWlnaHQgPSBuYkdyb3VwcyAqIF9ncm91cEl0ZW1IZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzSGVpZ2h0ID0gKF9jb21ib0l0ZW1IZWlnaHQgKiBkYXRhLmxlbmd0aCkgKyB0bXBSZXNIZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzSGVpZ2h0ID0gX2NvbWJvSXRlbUhlaWdodCAqIChkYXRhLmxlbmd0aCArIG5iR3JvdXBzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmKHJlc0hlaWdodCA8IG1zLmNvbWJvYm94LmhlaWdodCgpIHx8IHJlc0hlaWdodCA8PSBjZmcubWF4RHJvcEhlaWdodCkge1xuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5oZWlnaHQocmVzSGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZihyZXNIZWlnaHQgPj0gbXMuY29tYm9ib3guaGVpZ2h0KCkgJiYgcmVzSGVpZ2h0ID4gY2ZnLm1heERyb3BIZWlnaHQpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guaGVpZ2h0KGNmZy5tYXhEcm9wSGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PT0gMSAmJiBjZmcuYXV0b1NlbGVjdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5jaGlsZHJlbigpLmZpbHRlcignOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmxhc3QnKS5hZGRDbGFzcygnbXMtcmVzLWl0ZW0tYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGNmZy5zZWxlY3RGaXJzdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5jaGlsZHJlbigpLmZpbHRlcignOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0JykuYWRkQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID09PSAwICYmIG1zLmdldFJhd1ZhbHVlKCkgIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5vU3VnZ2VzdGlvblRleHQgPSBjZmcubm9TdWdnZXN0aW9uVGV4dC5yZXBsYWNlKC9cXHtcXHsuKlxcfVxcfS8sIG1zLmlucHV0LnZhbCgpKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKG5vU3VnZ2VzdGlvblRleHQpO1xuICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFdoZW4gZnJlZSBlbnRyeSBpcyBvZmYsIGFkZCBpbnZhbGlkIGNsYXNzIHRvIGlucHV0IGlmIG5vIGRhdGEgbWF0Y2hlc1xuICAgICAgICAgICAgICAgIGlmKGNmZy5hbGxvd0ZyZWVFbnRyaWVzID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAkKG1zLmlucHV0KS5hZGRDbGFzcyhjZmcuaW52YWxpZENscyk7XG4gICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJChtcy5pbnB1dCkucmVtb3ZlQ2xhc3MoY2ZnLmludmFsaWRDbHMpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyBhbiBhcnJheSBvZiBqc29uIG9iamVjdHMgZnJvbSBhbiBhcnJheSBvZiBzdHJpbmdzLlxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX2dldEVudHJpZXNGcm9tU3RyaW5nQXJyYXk6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIganNvbiA9IFtdO1xuICAgICAgICAgICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbihpbmRleCwgcykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZW50cnkgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgZW50cnlbY2ZnLmRpc3BsYXlGaWVsZF0gPSBlbnRyeVtjZmcudmFsdWVGaWVsZF0gPSAkLnRyaW0ocyk7XG4gICAgICAgICAgICAgICAgICAgIGpzb24ucHVzaChlbnRyeSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGpzb247XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlcGxhY2VzIGh0bWwgd2l0aCBoaWdobGlnaHRlZCBodG1sIGFjY29yZGluZyB0byBjYXNlXG4gICAgICAgICAgICAgKiBAcGFyYW0gaHRtbFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX2hpZ2hsaWdodFN1Z2dlc3Rpb246IGZ1bmN0aW9uKGh0bWwpIHtcbiAgICAgICAgICAgICAgICB2YXIgcSA9IG1zLmlucHV0LnZhbCgpO1xuXG4gICAgICAgICAgICAgICAgLy9lc2NhcGUgc3BlY2lhbCByZWdleCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgICAgdmFyIHNwZWNpYWxDaGFyYWN0ZXJzID0gWydeJywgJyQnLCAnKicsICcrJywgJz8nLCAnLicsICcoJywgJyknLCAnOicsICchJywgJ3wnLCAneycsICd9JywgJ1snLCAnXSddO1xuXG4gICAgICAgICAgICAgICAgJC5lYWNoKHNwZWNpYWxDaGFyYWN0ZXJzLCBmdW5jdGlvbiAoaW5kZXgsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHEgPSBxLnJlcGxhY2UodmFsdWUsIFwiXFxcXFwiICsgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICBpZihxLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaHRtbDsgLy8gbm90aGluZyBlbnRlcmVkIGFzIGlucHV0XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGdsb2IgPSBjZmcubWF0Y2hDYXNlID09PSB0cnVlID8gJ2cnIDogJ2dpJztcbiAgICAgICAgICAgICAgICByZXR1cm4gaHRtbC5yZXBsYWNlKG5ldyBSZWdFeHAoJygnICsgcSArICcpKD8hKFtePF0rKT8+KScsIGdsb2IpLCAnPGVtPiQxPC9lbT4nKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogTW92ZXMgdGhlIHNlbGVjdGVkIGN1cnNvciBhbW9uZ3N0IHRoZSBsaXN0IGl0ZW1cbiAgICAgICAgICAgICAqIEBwYXJhbSBkaXIgLSAndXAnIG9yICdkb3duJ1xuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX21vdmVTZWxlY3RlZFJvdzogZnVuY3Rpb24oZGlyKSB7XG4gICAgICAgICAgICAgICAgaWYoIWNmZy5leHBhbmRlZCkge1xuICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGxpc3QsIHN0YXJ0LCBhY3RpdmUsIHNjcm9sbFBvcztcbiAgICAgICAgICAgICAgICBsaXN0ID0gbXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKVwiKTtcbiAgICAgICAgICAgICAgICBpZihkaXIgPT09ICdkb3duJykge1xuICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGxpc3QuZXEoMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGxpc3QuZmlsdGVyKCc6bGFzdCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhY3RpdmUgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0Jyk7XG4gICAgICAgICAgICAgICAgaWYoYWN0aXZlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoZGlyID09PSAnZG93bicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gYWN0aXZlLm5leHRBbGwoJy5tcy1yZXMtaXRlbTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKScpLmZpcnN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzdGFydC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGxpc3QuZXEoMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxQb3MgPSBtcy5jb21ib2JveC5zY3JvbGxUb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LnNjcm9sbFRvcCgwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXJ0WzBdLm9mZnNldFRvcCArIHN0YXJ0Lm91dGVySGVpZ2h0KCkgPiBtcy5jb21ib2JveC5oZWlnaHQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LnNjcm9sbFRvcChzY3JvbGxQb3MgKyBfY29tYm9JdGVtSGVpZ2h0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gYWN0aXZlLnByZXZBbGwoJy5tcy1yZXMtaXRlbTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKScpLmZpcnN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzdGFydC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGxpc3QuZmlsdGVyKCc6bGFzdCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LnNjcm9sbFRvcChfY29tYm9JdGVtSGVpZ2h0ICogbGlzdC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhcnRbMF0ub2Zmc2V0VG9wIDwgbXMuY29tYm9ib3guc2Nyb2xsVG9wKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3AobXMuY29tYm9ib3guc2Nyb2xsVG9wKCkgLSBfY29tYm9JdGVtSGVpZ2h0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsaXN0LnJlbW92ZUNsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpO1xuICAgICAgICAgICAgICAgIHN0YXJ0LmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBY2NvcmRpbmcgdG8gZ2l2ZW4gZGF0YSBhbmQgcXVlcnksIHNvcnQgYW5kIGFkZCBzdWdnZXN0aW9ucyBpbiB0aGVpciBjb250YWluZXJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9wcm9jZXNzU3VnZ2VzdGlvbnM6IGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgICAgICAgICAgIHZhciBqc29uID0gbnVsbCwgZGF0YSA9IHNvdXJjZSB8fCBjZmcuZGF0YTtcbiAgICAgICAgICAgICAgICBpZihkYXRhICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZihkYXRhKSA9PT0gJ2Z1bmN0aW9uJyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhID0gZGF0YS5jYWxsKG1zLCBtcy5nZXRSYXdWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YoZGF0YSkgPT09ICdzdHJpbmcnKSB7IC8vIGdldCByZXN1bHRzIGZyb20gYWpheFxuICAgICAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignYmVmb3JlbG9hZCcsIFttc10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge31cbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5UGFyYW1zW2NmZy5xdWVyeVBhcmFtXSA9IG1zLmlucHV0LnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9ICQuZXh0ZW5kKHF1ZXJ5UGFyYW1zLCBjZmcuZGF0YVVybFBhcmFtcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkLmFqYXgoJC5leHRlbmQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGNmZy5tZXRob2QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBkYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWZvcmVTZW5kOiBjZmcuYmVmb3JlU2VuZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihhc3luY0RhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29uID0gdHlwZW9mKGFzeW5jRGF0YSkgPT09ICdzdHJpbmcnID8gSlNPTi5wYXJzZShhc3luY0RhdGEpIDogYXN5bmNEYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoanNvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2xvYWQnLCBbbXMsIGpzb25dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoc2VsZi5fYXN5bmNWYWx1ZXMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuc2V0VmFsdWUodHlwZW9mKHNlbGYuX2FzeW5jVmFsdWVzKSA9PT0gJ3N0cmluZycgPyBKU09OLnBhcnNlKHNlbGYuX2FzeW5jVmFsdWVzKSA6IHNlbGYuX2FzeW5jVmFsdWVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlKHNlbGYuX2FzeW5jVmFsdWVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93KFwiQ291bGQgbm90IHJlYWNoIHNlcnZlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBjZmcuYWpheENvbmZpZykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgeyAvLyByZXN1bHRzIGZyb20gbG9jYWwgYXJyYXlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID4gMCAmJiB0eXBlb2YoZGF0YVswXSkgPT09ICdzdHJpbmcnKSB7IC8vIHJlc3VsdHMgZnJvbSBhcnJheSBvZiBzdHJpbmdzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NiRGF0YSA9IHNlbGYuX2dldEVudHJpZXNGcm9tU3RyaW5nQXJyYXkoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgeyAvLyByZWd1bGFyIGpzb24gYXJyYXkgb3IganNvbiBvYmplY3Qgd2l0aCByZXN1bHRzIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NiRGF0YSA9IGRhdGFbY2ZnLnJlc3VsdHNGaWVsZF0gfHwgZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgc29ydGVkRGF0YSA9IGNmZy5tb2RlID09PSAncmVtb3RlJyA/IF9jYkRhdGEgOiBzZWxmLl9zb3J0QW5kVHJpbShfY2JEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fZGlzcGxheVN1Z2dlc3Rpb25zKHNlbGYuX2dyb3VwKHNvcnRlZERhdGEpKTtcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVuZGVyIHRoZSBjb21wb25lbnQgdG8gdGhlIGdpdmVuIGlucHV0IERPTSBlbGVtZW50XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfcmVuZGVyOiBmdW5jdGlvbihlbCkge1xuICAgICAgICAgICAgICAgIG1zLnNldE5hbWUoY2ZnLm5hbWUpOyAgLy8gbWFrZSBzdXJlIHRoZSBmb3JtIG5hbWUgaXMgY29ycmVjdFxuICAgICAgICAgICAgICAgIC8vIGhvbGRzIHRoZSBtYWluIGRpdiwgd2lsbCByZWxheSB0aGUgZm9jdXMgZXZlbnRzIHRvIHRoZSBjb250YWluZWQgaW5wdXQgZWxlbWVudC5cbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1jdG4gZm9ybS1jb250cm9sICcgKyAoY2ZnLnJlc3VsdEFzU3RyaW5nID8gJ21zLWFzLXN0cmluZyAnIDogJycpICsgY2ZnLmNscyArXG4gICAgICAgICAgICAgICAgICAgICAgICAoJChlbCkuaGFzQ2xhc3MoJ2lucHV0LWxnJykgPyAnIGlucHV0LWxnJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAoJChlbCkuaGFzQ2xhc3MoJ2lucHV0LXNtJykgPyAnIGlucHV0LXNtJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2ZnLmRpc2FibGVkID09PSB0cnVlID8gJyBtcy1jdG4tZGlzYWJsZWQnIDogJycpICtcbiAgICAgICAgICAgICAgICAgICAgICAgIChjZmcuZWRpdGFibGUgPT09IHRydWUgPyAnJyA6ICcgbXMtY3RuLXJlYWRvbmx5JykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKGNmZy5oaWRlVHJpZ2dlciA9PT0gZmFsc2UgPyAnJyA6ICcgbXMtbm8tdHJpZ2dlcicpLFxuICAgICAgICAgICAgICAgICAgICBzdHlsZTogY2ZnLnN0eWxlLFxuICAgICAgICAgICAgICAgICAgICBpZDogY2ZnLmlkXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmZvY3VzKCQucHJveHkoaGFuZGxlcnMuX29uRm9jdXMsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYmx1cigkLnByb3h5KGhhbmRsZXJzLl9vbkJsdXIsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIua2V5ZG93bigkLnByb3h5KGhhbmRsZXJzLl9vbktleURvd24sIHRoaXMpKTtcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIua2V5dXAoJC5wcm94eShoYW5kbGVycy5fb25LZXlVcCwgdGhpcykpO1xuXG4gICAgICAgICAgICAgICAgLy8gaG9sZHMgdGhlIGlucHV0IGZpZWxkXG4gICAgICAgICAgICAgICAgbXMuaW5wdXQgPSAkKCc8aW5wdXQvPicsICQuZXh0ZW5kKHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiBjZmcuZWRpdGFibGUgPT09IHRydWUgPyAnJyA6ICcgbXMtaW5wdXQtcmVhZG9ubHknLFxuICAgICAgICAgICAgICAgICAgICByZWFkb25seTogIWNmZy5lZGl0YWJsZSxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGNmZy5wbGFjZWhvbGRlcixcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGNmZy5kaXNhYmxlZFxuICAgICAgICAgICAgICAgIH0sIGNmZy5pbnB1dENmZykpO1xuXG4gICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoJC5wcm94eShoYW5kbGVycy5fb25JbnB1dEZvY3VzLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgbXMuaW5wdXQuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25JbnB1dENsaWNrLCB0aGlzKSk7XG5cbiAgICAgICAgICAgICAgICAvLyBob2xkcyB0aGUgc3VnZ2VzdGlvbnMuIHdpbGwgYWx3YXlzIGJlIHBsYWNlZCBvbiBmb2N1c1xuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94ID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtcmVzLWN0biBkcm9wZG93bi1tZW51J1xuICAgICAgICAgICAgICAgIH0pLmhlaWdodChjZmcubWF4RHJvcEhlaWdodCk7XG5cbiAgICAgICAgICAgICAgICAvLyBiaW5kIHRoZSBvbmNsaWNrIGFuZCBtb3VzZW92ZXIgdXNpbmcgZGVsZWdhdGVkIGV2ZW50cyAobmVlZHMgalF1ZXJ5ID49IDEuNylcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5vbignY2xpY2snLCAnZGl2Lm1zLXJlcy1pdGVtJywgJC5wcm94eShoYW5kbGVycy5fb25Db21ib0l0ZW1TZWxlY3RlZCwgdGhpcykpO1xuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94Lm9uKCdtb3VzZW92ZXInLCAnZGl2Lm1zLXJlcy1pdGVtJywgJC5wcm94eShoYW5kbGVycy5fb25Db21ib0l0ZW1Nb3VzZU92ZXIsIHRoaXMpKTtcblxuICAgICAgICAgICAgICAgIGlmKGNmZy5zZWxlY3Rpb25Db250YWluZXIpe1xuICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIgPSBjZmcuc2VsZWN0aW9uQ29udGFpbmVyO1xuICAgICAgICAgICAgICAgICAgICAkKG1zLnNlbGVjdGlvbkNvbnRhaW5lcikuYWRkQ2xhc3MoJ21zLXNlbC1jdG4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtc2VsLWN0bidcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vbkZvY3VzLCB0aGlzKSk7XG5cbiAgICAgICAgICAgICAgICBpZihjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgIWNmZy5zZWxlY3Rpb25Db250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmFwcGVuZChtcy5pbnB1dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYXBwZW5kKG1zLmlucHV0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBtcy5oZWxwZXIgPSAkKCc8c3Bhbi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtaGVscGVyICcgKyBjZmcuaW5mb01zZ0Nsc1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcigpO1xuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hcHBlbmQobXMuaGVscGVyKTtcblxuXG4gICAgICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSB3aG9sZSB0aGluZ1xuICAgICAgICAgICAgICAgICQoZWwpLnJlcGxhY2VXaXRoKG1zLmNvbnRhaW5lcik7XG5cbiAgICAgICAgICAgICAgICBpZighY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaChjZmcuc2VsZWN0aW9uUG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2JvdHRvbSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmluc2VydEFmdGVyKG1zLmNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLnNlbGVjdGlvblN0YWNrZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLndpZHRoKG1zLmNvbnRhaW5lci53aWR0aCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmFkZENsYXNzKCdtcy1zdGFja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncmlnaHQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5pbnNlcnRBZnRlcihtcy5jb250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5jc3MoJ2Zsb2F0JywgJ2xlZnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFwcGVuZChtcy5zZWxlY3Rpb25Db250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICAvLyBob2xkcyB0aGUgdHJpZ2dlciBvbiB0aGUgcmlnaHQgc2lkZVxuICAgICAgICAgICAgICAgIGlmKGNmZy5oaWRlVHJpZ2dlciA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMudHJpZ2dlciA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy10cmlnZ2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6ICc8ZGl2IGNsYXNzPVwibXMtdHJpZ2dlci1pY29cIj48L2Rpdj4nXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBtcy50cmlnZ2VyLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uVHJpZ2dlckNsaWNrLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hcHBlbmQobXMudHJpZ2dlcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJCh3aW5kb3cpLnJlc2l6ZSgkLnByb3h5KGhhbmRsZXJzLl9vbldpbmRvd1Jlc2l6ZWQsIHRoaXMpKTtcblxuICAgICAgICAgICAgICAgIC8vIGRvIG5vdCBwZXJmb3JtIGFuIGluaXRpYWwgY2FsbCBpZiB3ZSBhcmUgdXNpbmcgYWpheCB1bmxlc3Mgd2UgaGF2ZSBpbml0aWFsIHZhbHVlc1xuICAgICAgICAgICAgICAgIGlmKGNmZy52YWx1ZSAhPT0gbnVsbCB8fCBjZmcuZGF0YSAhPT0gbnVsbCl7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZihjZmcuZGF0YSkgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX2FzeW5jVmFsdWVzID0gY2ZnLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy52YWx1ZSAhPT0gbnVsbCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuc2V0VmFsdWUoY2ZnLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJChcImJvZHlcIikuY2xpY2soZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBpZihtcy5jb250YWluZXIuaGFzQ2xhc3MoJ21zLWN0bi1mb2N1cycpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuaGFzKGUudGFyZ2V0KS5sZW5ndGggPT09IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGUudGFyZ2V0LmNsYXNzTmFtZS5pbmRleE9mKCdtcy1yZXMtaXRlbScpIDwgMCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgZS50YXJnZXQuY2xhc3NOYW1lLmluZGV4T2YoJ21zLWNsb3NlLWJ0bicpIDwgMCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyWzBdICE9PSBlLnRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuX29uQmx1cigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2ZnLmV4cGFuZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVuZGVycyBlYWNoIGVsZW1lbnQgd2l0aGluIHRoZSBjb21ibyBib3hcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9yZW5kZXJDb21ib0l0ZW1zOiBmdW5jdGlvbihpdGVtcywgaXNHcm91cGVkKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlZiA9IHRoaXMsIGh0bWwgPSAnJztcbiAgICAgICAgICAgICAgICAkLmVhY2goaXRlbXMsIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGlzcGxheWVkID0gY2ZnLnJlbmRlcmVyICE9PSBudWxsID8gY2ZnLnJlbmRlcmVyLmNhbGwocmVmLCB2YWx1ZSkgOiB2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRpc2FibGVkID0gY2ZnLmRpc2FibGVkRmllbGQgIT09IG51bGwgJiYgdmFsdWVbY2ZnLmRpc2FibGVkRmllbGRdID09PSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0SXRlbUVsID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXJlcy1pdGVtICcgKyAoaXNHcm91cGVkID8gJ21zLXJlcy1pdGVtLWdyb3VwZWQgJzonJykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkaXNhYmxlZCA/ICdtcy1yZXMtaXRlbS1kaXNhYmxlZCAnOicnKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGluZGV4ICUgMiA9PT0gMSAmJiBjZmcudXNlWmVicmFTdHlsZSA9PT0gdHJ1ZSA/ICdtcy1yZXMtb2RkJyA6ICcnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IGNmZy5oaWdobGlnaHQgPT09IHRydWUgPyBzZWxmLl9oaWdobGlnaHRTdWdnZXN0aW9uKGRpc3BsYXllZCkgOiBkaXNwbGF5ZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAnZGF0YS1qc29uJzogSlNPTi5zdHJpbmdpZnkodmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICQoJzxkaXYvPicpLmFwcGVuZChyZXN1bHRJdGVtRWwpLmh0bWwoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5hcHBlbmQoaHRtbCk7XG4gICAgICAgICAgICAgICAgX2NvbWJvSXRlbUhlaWdodCA9IG1zLmNvbWJvYm94LmZpbmQoJy5tcy1yZXMtaXRlbTpmaXJzdCcpLm91dGVySGVpZ2h0KCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlbmRlcnMgdGhlIHNlbGVjdGVkIGl0ZW1zIGludG8gdGhlaXIgY29udGFpbmVyLlxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3JlbmRlclNlbGVjdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlZiA9IHRoaXMsIHcgPSAwLCBpbnB1dE9mZnNldCA9IDAsIGl0ZW1zID0gW10sXG4gICAgICAgICAgICAgICAgICAgIGFzVGV4dCA9IGNmZy5yZXN1bHRBc1N0cmluZyA9PT0gdHJ1ZSAmJiAhX2hhc0ZvY3VzO1xuXG4gICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmZpbmQoJy5tcy1zZWwtaXRlbScpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGlmKG1zLl92YWx1ZUNvbnRhaW5lciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLl92YWx1ZUNvbnRhaW5lci5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkLmVhY2goX3NlbGVjdGlvbiwgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKXtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtRWwsIGRlbEl0ZW1FbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbUh0bWwgPSBjZmcuc2VsZWN0aW9uUmVuZGVyZXIgIT09IG51bGwgPyBjZmcuc2VsZWN0aW9uUmVuZGVyZXIuY2FsbChyZWYsIHZhbHVlKSA6IHZhbHVlW2NmZy5kaXNwbGF5RmllbGRdO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWxpZENscyA9IHNlbGYuX3ZhbGlkYXRlU2luZ2xlSXRlbSh2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXSkgPyAnJyA6ICcgbXMtc2VsLWludmFsaWQnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHRhZyByZXByZXNlbnRpbmcgc2VsZWN0ZWQgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgaWYoYXNUZXh0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW1FbCA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtc2VsLWl0ZW0gbXMtc2VsLXRleHQgJyArIGNmZy5zZWxlY3Rpb25DbHMgKyB2YWxpZENscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBzZWxlY3RlZEl0ZW1IdG1sICsgKGluZGV4ID09PSAoX3NlbGVjdGlvbi5sZW5ndGggLSAxKSA/ICcnIDogY2ZnLnJlc3VsdEFzU3RyaW5nRGVsaW1pdGVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuZGF0YSgnanNvbicsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbUVsID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1zZWwtaXRlbSAnICsgY2ZnLnNlbGVjdGlvbkNscyArIHZhbGlkQ2xzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IHNlbGVjdGVkSXRlbUh0bWxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmRhdGEoJ2pzb24nLCB2YWx1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5kaXNhYmxlZCA9PT0gZmFsc2Upe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNtYWxsIGNyb3NzIGltZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbEl0ZW1FbCA9ICQoJzxzcGFuLz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1jbG9zZS1idG4nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuZGF0YSgnanNvbicsIHZhbHVlKS5hcHBlbmRUbyhzZWxlY3RlZEl0ZW1FbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxJdGVtRWwuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25UYWdUcmlnZ2VyQ2xpY2ssIHJlZikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaChzZWxlY3RlZEl0ZW1FbCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLnByZXBlbmQoaXRlbXMpO1xuXG4gICAgICAgICAgICAgICAgLy8gc3RvcmUgdGhlIHZhbHVlcywgYmVoYXZpb3VyIG9mIG11bHRpcGxlIHNlbGVjdFxuICAgICAgICAgICAgICAgIG1zLl92YWx1ZUNvbnRhaW5lciA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6ICdkaXNwbGF5OiBub25lOydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAkLmVhY2gobXMuZ2V0VmFsdWUoKSwgZnVuY3Rpb24oaSwgdmFsKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsID0gJCgnPGlucHV0Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaGlkZGVuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGNmZy5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgZWwuYXBwZW5kVG8obXMuX3ZhbHVlQ29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBtcy5fdmFsdWVDb250YWluZXIuYXBwZW5kVG8obXMuc2VsZWN0aW9uQ29udGFpbmVyKTtcblxuICAgICAgICAgICAgICAgIGlmKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiAhY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC53aWR0aCgwKTtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXRPZmZzZXQgPSBtcy5pbnB1dC5vZmZzZXQoKS5sZWZ0IC0gbXMuc2VsZWN0aW9uQ29udGFpbmVyLm9mZnNldCgpLmxlZnQ7XG4gICAgICAgICAgICAgICAgICAgIHcgPSBtcy5jb250YWluZXIud2lkdGgoKSAtIGlucHV0T2Zmc2V0IC0gNDI7XG4gICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LndpZHRoKHcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmKF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsIF9zZWxlY3Rpb24ubGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuaGVscGVyLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNlbGVjdCBhbiBpdGVtIGVpdGhlciB0aHJvdWdoIGtleWJvYXJkIG9yIG1vdXNlXG4gICAgICAgICAgICAgKiBAcGFyYW0gaXRlbVxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3NlbGVjdEl0ZW06IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICBpZihjZmcubWF4U2VsZWN0aW9uID09PSAxKXtcbiAgICAgICAgICAgICAgICAgICAgX3NlbGVjdGlvbiA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtcy5hZGRUb1NlbGVjdGlvbihpdGVtLmRhdGEoJ2pzb24nKSk7XG4gICAgICAgICAgICAgICAgaXRlbS5yZW1vdmVDbGFzcygnbXMtcmVzLWl0ZW0tYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZE9uRm9jdXMgPT09IGZhbHNlIHx8IF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKXtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYoIV9oYXNGb2N1cyl7XG4gICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmKF9oYXNGb2N1cyAmJiAoY2ZnLmV4cGFuZE9uRm9jdXMgfHwgX2N0cmxEb3duKSl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xuICAgICAgICAgICAgICAgICAgICBpZihfY3RybERvd24pe1xuICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNvcnRzIHRoZSByZXN1bHRzIGFuZCBjdXQgdGhlbSBkb3duIHRvIG1heCAjIG9mIGRpc3BsYXllZCByZXN1bHRzIGF0IG9uY2VcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9zb3J0QW5kVHJpbTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBxID0gbXMuZ2V0UmF3VmFsdWUoKSxcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgbmV3U3VnZ2VzdGlvbnMgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRWYWx1ZXMgPSBtcy5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIC8vIGZpbHRlciB0aGUgZGF0YSBhY2NvcmRpbmcgdG8gZ2l2ZW4gaW5wdXRcbiAgICAgICAgICAgICAgICBpZihxLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uKGluZGV4LCBvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuYW1lID0gb2JqW2NmZy5kaXNwbGF5RmllbGRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoKGNmZy5tYXRjaENhc2UgPT09IHRydWUgJiYgbmFtZS5pbmRleE9mKHEpID4gLTEpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGNmZy5tYXRjaENhc2UgPT09IGZhbHNlICYmIG5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHEudG9Mb3dlckNhc2UoKSkgPiAtMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuc3RyaWN0U3VnZ2VzdCA9PT0gZmFsc2UgfHwgbmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocS50b0xvd2VyQ2FzZSgpKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZC5wdXNoKG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkID0gZGF0YTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gdGFrZSBvdXQgdGhlIG9uZXMgdGhhdCBoYXZlIGFscmVhZHkgYmVlbiBzZWxlY3RlZFxuICAgICAgICAgICAgICAgICQuZWFjaChmaWx0ZXJlZCwgZnVuY3Rpb24oaW5kZXgsIG9iaikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ZnLmFsbG93RHVwbGljYXRlcyB8fCAkLmluQXJyYXkob2JqW2NmZy52YWx1ZUZpZWxkXSwgc2VsZWN0ZWRWYWx1ZXMpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U3VnZ2VzdGlvbnMucHVzaChvYmopO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gc29ydCB0aGUgZGF0YVxuICAgICAgICAgICAgICAgIGlmKGNmZy5zb3J0T3JkZXIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3U3VnZ2VzdGlvbnMuc29ydChmdW5jdGlvbihhLGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGFbY2ZnLnNvcnRPcmRlcl0gPCBiW2NmZy5zb3J0T3JkZXJdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNmZy5zb3J0RGlyID09PSAnYXNjJyA/IC0xIDogMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGFbY2ZnLnNvcnRPcmRlcl0gPiBiW2NmZy5zb3J0T3JkZXJdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNmZy5zb3J0RGlyID09PSAnYXNjJyA/IDEgOiAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gdHJpbSBpdCBkb3duXG4gICAgICAgICAgICAgICAgaWYoY2ZnLm1heFN1Z2dlc3Rpb25zICYmIGNmZy5tYXhTdWdnZXN0aW9ucyA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3U3VnZ2VzdGlvbnMgPSBuZXdTdWdnZXN0aW9ucy5zbGljZSgwLCBjZmcubWF4U3VnZ2VzdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3U3VnZ2VzdGlvbnM7XG5cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIF9ncm91cDogZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgLy8gYnVpbGQgZ3JvdXBzXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmdyb3VwQnkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgX2dyb3VwcyA9IHt9O1xuXG4gICAgICAgICAgICAgICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcm9wcyA9IGNmZy5ncm91cEJ5LmluZGV4T2YoJy4nKSA+IC0xID8gY2ZnLmdyb3VwQnkuc3BsaXQoJy4nKSA6IGNmZy5ncm91cEJ5O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByb3AgPSB2YWx1ZVtjZmcuZ3JvdXBCeV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YocHJvcHMpICE9ICdzdHJpbmcnKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUocHJvcHMubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3AgPSBwcm9wW3Byb3BzLnNoaWZ0KCldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKF9ncm91cHNbcHJvcF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9ncm91cHNbcHJvcF0gPSB7dGl0bGU6IHByb3AsIGl0ZW1zOiBbdmFsdWVdfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9ncm91cHNbcHJvcF0uaXRlbXMucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVXBkYXRlIHRoZSBoZWxwZXIgdGV4dFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3VwZGF0ZUhlbHBlcjogZnVuY3Rpb24oaHRtbCkge1xuICAgICAgICAgICAgICAgIG1zLmhlbHBlci5odG1sKGh0bWwpO1xuICAgICAgICAgICAgICAgIGlmKCFtcy5oZWxwZXIuaXMoXCI6dmlzaWJsZVwiKSkge1xuICAgICAgICAgICAgICAgICAgICBtcy5oZWxwZXIuZmFkZUluKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBWYWxpZGF0ZSBhbiBpdGVtIGFnYWluc3QgdnR5cGUgb3IgdnJlZ2V4XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfdmFsaWRhdGVTaW5nbGVJdGVtOiBmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgICAgICAgICAgaWYoY2ZnLnZyZWdleCAhPT0gbnVsbCAmJiBjZmcudnJlZ2V4IGluc3RhbmNlb2YgUmVnRXhwKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNmZy52cmVnZXgudGVzdCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmKGNmZy52dHlwZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2goY2ZnLnZ0eXBlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2FscGhhJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoL15bYS16QS1aX10rJC8pLnRlc3QodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnYWxwaGFudW0nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvXlthLXpBLVowLTlfXSskLykudGVzdCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdlbWFpbCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC9eKFxcdyspKFtcXC0rLl1bXFx3XSspKkAoXFx3W1xcLVxcd10qXFwuKXsxLDV9KFtBLVphLXpdKXsyLDZ9JC8pLnRlc3QodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAndXJsJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoLygoKF5odHRwcz8pfCheZnRwKSk6XFwvXFwvKFtcXC1cXHddK1xcLikrXFx3ezIsM30oXFwvWyVcXC1cXHddKyhcXC5cXHd7Mix9KT8pKigoW1xcd1xcLVxcLlxcP1xcXFxcXC8rQCYjO2B+PSUhXSopKFxcLlxcd3syLH0pPykqXFwvPykvaSkudGVzdCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdpcGFkZHJlc3MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvXlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9JC8pLnRlc3QodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBoYW5kbGVycyA9IHtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gYmx1cnJpbmcgb3V0IG9mIHRoZSBjb21wb25lbnRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbkJsdXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5yZW1vdmVDbGFzcygnbXMtY3RuLWZvY3VzJyk7XG4gICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICBfaGFzRm9jdXMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZihtcy5nZXRSYXdWYWx1ZSgpICE9PSAnJyAmJiBjZmcuYWxsb3dGcmVlRW50cmllcyA9PT0gdHJ1ZSl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgb2JqW2NmZy5kaXNwbGF5RmllbGRdID0gb2JqW2NmZy52YWx1ZUZpZWxkXSA9IG1zLmdldFJhd1ZhbHVlKCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICBtcy5hZGRUb1NlbGVjdGlvbihvYmopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcblxuICAgICAgICAgICAgICAgIGlmKG1zLmlzVmFsaWQoKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFkZENsYXNzKGNmZy5pbnZhbGlkQ2xzKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBlbHNlIGlmKG1zLmlucHV0LnZhbCgpICE9PSAnJyAmJiBjZmcuYWxsb3dGcmVlRW50cmllcyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuZW1wdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKCcnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdibHVyJywgW21zXSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGhvdmVyaW5nIGFuIGVsZW1lbnQgaW4gdGhlIGNvbWJvXG4gICAgICAgICAgICAgKiBAcGFyYW0gZVxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uQ29tYm9JdGVtTW91c2VPdmVyOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgICAgICBpZighdGFyZ2V0Lmhhc0NsYXNzKCdtcy1yZXMtaXRlbS1kaXNhYmxlZCcpKXtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guY2hpbGRyZW4oKS5yZW1vdmVDbGFzcygnbXMtcmVzLWl0ZW0tYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5hZGRDbGFzcygnbXMtcmVzLWl0ZW0tYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBhbiBpdGVtIGlzIGNob3NlbiBmcm9tIHRoZSBsaXN0XG4gICAgICAgICAgICAgKiBAcGFyYW0gZVxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uQ29tYm9JdGVtU2VsZWN0ZWQ6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgICAgIGlmKCF0YXJnZXQuaGFzQ2xhc3MoJ21zLXJlcy1pdGVtLWRpc2FibGVkJykpe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9zZWxlY3RJdGVtKCQoZS5jdXJyZW50VGFyZ2V0KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBmb2N1c2luZyBvbiB0aGUgY29udGFpbmVyIGRpdi4gV2lsbCBmb2N1cyBvbiB0aGUgaW5wdXQgZmllbGQgaW5zdGVhZC5cbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbkZvY3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBjbGlja2luZyBvbiB0aGUgaW5wdXQgdGV4dCBmaWVsZFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uSW5wdXRDbGljazogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAobXMuaXNEaXNhYmxlZCgpID09PSBmYWxzZSAmJiBfaGFzRm9jdXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNmZy50b2dnbGVPbkNsaWNrID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2ZnLmV4cGFuZGVkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gZm9jdXNpbmcgb24gdGhlIGlucHV0IHRleHQgZmllbGQuXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25JbnB1dEZvY3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZihtcy5pc0Rpc2FibGVkKCkgPT09IGZhbHNlICYmICFfaGFzRm9jdXMpIHtcbiAgICAgICAgICAgICAgICAgICAgX2hhc0ZvY3VzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFkZENsYXNzKCdtcy1jdG4tZm9jdXMnKTtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKGNmZy5pbnZhbGlkQ2xzKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgY3VyTGVuZ3RoID0gbXMuZ2V0UmF3VmFsdWUoKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRPbkZvY3VzID09PSB0cnVlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLCBfc2VsZWN0aW9uLmxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYoY3VyTGVuZ3RoIDwgY2ZnLm1pbkNoYXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLCBjZmcubWluQ2hhcnMgLSBjdXJMZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdmb2N1cycsIFttc10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gdGhlIHVzZXIgcHJlc3NlcyBhIGtleSB3aGlsZSB0aGUgY29tcG9uZW50IGhhcyBmb2N1c1xuICAgICAgICAgICAgICogVGhpcyBpcyB3aGVyZSB3ZSB3YW50IHRvIGhhbmRsZSBhbGwga2V5cyB0aGF0IGRvbid0IHJlcXVpcmUgdGhlIHVzZXIgaW5wdXQgZmllbGRcbiAgICAgICAgICAgICAqIHNpbmNlIGl0IGhhc24ndCByZWdpc3RlcmVkIHRoZSBrZXkgaGl0IHlldFxuICAgICAgICAgICAgICogQHBhcmFtIGUga2V5RXZlbnRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbktleURvd246IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBjaGVjayBob3cgdGFiIHNob3VsZCBiZSBoYW5kbGVkXG4gICAgICAgICAgICAgICAgdmFyIGFjdGl2ZSA9IG1zLmNvbWJvYm94LmZpbmQoJy5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3QnKSxcbiAgICAgICAgICAgICAgICAgICAgZnJlZUlucHV0ID0gbXMuaW5wdXQudmFsKCk7XG4gICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcigna2V5ZG93bicsIFttcywgZV0pO1xuXG4gICAgICAgICAgICAgICAgaWYoZS5rZXlDb2RlID09PSBLRVlDT0RFUy5UQUIgJiYgKGNmZy51c2VUYWJLZXkgPT09IGZhbHNlIHx8XG4gICAgICAgICAgICAgICAgICAgIChjZmcudXNlVGFiS2V5ID09PSB0cnVlICYmIGFjdGl2ZS5sZW5ndGggPT09IDAgJiYgbXMuaW5wdXQudmFsKCkubGVuZ3RoID09PSAwKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuX29uQmx1cigpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN3aXRjaChlLmtleUNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5CQUNLU1BBQ0U6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihmcmVlSW5wdXQubGVuZ3RoID09PSAwICYmIG1zLmdldFNlbGVjdGlvbigpLmxlbmd0aCA+IDAgJiYgY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3NlbGVjdGlvbi5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdzZWxlY3Rpb25jaGFuZ2UnLCBbbXMsIG1zLmdldFNlbGVjdGlvbigpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQuYXR0cigncGxhY2Vob2xkZXInLCAoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmIG1zLmdldFZhbHVlKCkubGVuZ3RoID4gMCkgPyAnJyA6IGNmZy5wbGFjZWhvbGRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5UQUI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuRVNDOlxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuRU5URVI6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihmcmVlSW5wdXQgIT09ICcnIHx8IGNmZy5leHBhbmRlZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuQ09NTUE6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcudXNlQ29tbWFLZXkgPT09IHRydWUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkNUUkw6XG4gICAgICAgICAgICAgICAgICAgICAgICBfY3RybERvd24gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuRE9XTkFSUk9XOlxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fbW92ZVNlbGVjdGVkUm93KFwiZG93blwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLlVQQVJST1c6XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9tb3ZlU2VsZWN0ZWRSb3coXCJ1cFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGEga2V5IGlzIHJlbGVhc2VkIHdoaWxlIHRoZSBjb21wb25lbnQgaGFzIGZvY3VzXG4gICAgICAgICAgICAgKiBAcGFyYW0gZVxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uS2V5VXA6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZnJlZUlucHV0ID0gbXMuZ2V0UmF3VmFsdWUoKSxcbiAgICAgICAgICAgICAgICAgICAgaW5wdXRWYWxpZCA9ICQudHJpbShtcy5pbnB1dC52YWwoKSkubGVuZ3RoID4gMCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgKCFjZmcubWF4RW50cnlMZW5ndGggfHwgJC50cmltKG1zLmlucHV0LnZhbCgpKS5sZW5ndGggPD0gY2ZnLm1heEVudHJ5TGVuZ3RoKSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQsXG4gICAgICAgICAgICAgICAgICAgIG9iaiA9IHt9O1xuXG4gICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcigna2V5dXAnLCBbbXMsIGVdKTtcblxuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGltZXIpO1xuXG4gICAgICAgICAgICAgICAgLy8gY29sbGFwc2UgaWYgZXNjYXBlLCBidXQga2VlcCBmb2N1cy5cbiAgICAgICAgICAgICAgICBpZihlLmtleUNvZGUgPT09IEtFWUNPREVTLkVTQyAmJiBjZmcuZXhwYW5kZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guaGlkZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBpZ25vcmUgYSBidW5jaCBvZiBrZXlzXG4gICAgICAgICAgICAgICAgaWYoKGUua2V5Q29kZSA9PT0gS0VZQ09ERVMuVEFCICYmIGNmZy51c2VUYWJLZXkgPT09IGZhbHNlKSB8fCAoZS5rZXlDb2RlID4gS0VZQ09ERVMuRU5URVIgJiYgZS5rZXlDb2RlIDwgS0VZQ09ERVMuU1BBQ0UpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGUua2V5Q29kZSA9PT0gS0VZQ09ERVMuQ1RSTCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBfY3RybERvd24gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN3aXRjaChlLmtleUNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5VUEFSUk9XOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkRPV05BUlJPVzpcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5FTlRFUjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5UQUI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuQ09NTUE6XG4gICAgICAgICAgICAgICAgICAgIGlmKGUua2V5Q29kZSAhPT0gS0VZQ09ERVMuQ09NTUEgfHwgY2ZnLnVzZUNvbW1hS2V5ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpeyAvLyBpZiBhIHNlbGVjdGlvbiBpcyBwZXJmb3JtZWQsIHNlbGVjdCBpdCBhbmQgcmVzZXQgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZCA9IG1zLmNvbWJvYm94LmZpbmQoJy5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3QnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihzZWxlY3RlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3NlbGVjdEl0ZW0oc2VsZWN0ZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgbm8gc2VsZWN0aW9uIG9yIGlmIGZyZWV0ZXh0IGVudGVyZWQgYW5kIGZyZWUgZW50cmllcyBhbGxvd2VkLCBhZGQgbmV3IG9iaiB0byBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlucHV0VmFsaWQgPT09IHRydWUgJiYgY2ZnLmFsbG93RnJlZUVudHJpZXMgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmpbY2ZnLmRpc3BsYXlGaWVsZF0gPSBvYmpbY2ZnLnZhbHVlRmllbGRdID0gZnJlZUlucHV0LnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5hZGRUb1NlbGVjdGlvbihvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7IC8vIHJlc2V0IGNvbWJvIHN1Z2dlc3Rpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsIF9zZWxlY3Rpb24ubGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihmcmVlSW5wdXQubGVuZ3RoIDwgY2ZnLm1pbkNoYXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsIGNmZy5taW5DaGFycyAtIGZyZWVJbnB1dC5sZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYoY2ZnLm1heEVudHJ5TGVuZ3RoICYmIGZyZWVJbnB1dC5sZW5ndGggPiBjZmcubWF4RW50cnlMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhFbnRyeVJlbmRlcmVyLmNhbGwodGhpcywgZnJlZUlucHV0Lmxlbmd0aCAtIGNmZy5tYXhFbnRyeUxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmhlbHBlci5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5taW5DaGFycyA8PSBmcmVlSW5wdXQubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIGNmZy50eXBlRGVsYXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBjbGlja2luZyB1cG9uIGNyb3NzIGZvciBkZWxldGlvblxuICAgICAgICAgICAgICogQHBhcmFtIGVcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vblRhZ1RyaWdnZXJDbGljazogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIG1zLnJlbW92ZUZyb21TZWxlY3Rpb24oJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoJ2pzb24nKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGNsaWNraW5nIG9uIHRoZSBzbWFsbCB0cmlnZ2VyIGluIHRoZSByaWdodFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uVHJpZ2dlckNsaWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZihtcy5pc0Rpc2FibGVkKCkgPT09IGZhbHNlICYmICEoY2ZnLmV4cGFuZE9uRm9jdXMgPT09IHRydWUgJiYgX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pKSB7XG4gICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ3RyaWdnZXJjbGljaycsIFttc10pO1xuICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY3VyTGVuZ3RoID0gbXMuZ2V0UmF3VmFsdWUoKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjdXJMZW5ndGggPj0gY2ZnLm1pbkNoYXJzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLCBjZmcubWluQ2hhcnMgLSBjdXJMZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gdGhlIGJyb3dzZXIgd2luZG93IGlzIHJlc2l6ZWRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbldpbmRvd1Jlc2l6ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHN0YXJ0dXAgcG9pbnRcbiAgICAgICAgaWYoZWxlbWVudCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgc2VsZi5fcmVuZGVyKGVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgICQuZm4ubWFnaWNTdWdnZXN0ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB2YXIgb2JqID0gJCh0aGlzKTtcblxuICAgICAgICBpZihvYmouc2l6ZSgpID09PSAxICYmIG9iai5kYXRhKCdtYWdpY1N1Z2dlc3QnKSkge1xuICAgICAgICAgICAgcmV0dXJuIG9iai5kYXRhKCdtYWdpY1N1Z2dlc3QnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9iai5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICAgIC8vIGFzc3VtZSAkKHRoaXMpIGlzIGFuIGVsZW1lbnRcbiAgICAgICAgICAgIHZhciBjbnRyID0gJCh0aGlzKTtcblxuICAgICAgICAgICAgLy8gUmV0dXJuIGVhcmx5IGlmIHRoaXMgZWxlbWVudCBhbHJlYWR5IGhhcyBhIHBsdWdpbiBpbnN0YW5jZVxuICAgICAgICAgICAgaWYoY250ci5kYXRhKCdtYWdpY1N1Z2dlc3QnKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZih0aGlzLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdzZWxlY3QnKXsgLy8gcmVuZGVyaW5nIGZyb20gc2VsZWN0XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5kYXRhID0gW107XG4gICAgICAgICAgICAgICAgb3B0aW9ucy52YWx1ZSA9IFtdO1xuICAgICAgICAgICAgICAgICQuZWFjaCh0aGlzLmNoaWxkcmVuLCBmdW5jdGlvbihpbmRleCwgY2hpbGQpe1xuICAgICAgICAgICAgICAgICAgICBpZihjaGlsZC5ub2RlTmFtZSAmJiBjaGlsZC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnb3B0aW9uJyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmRhdGEucHVzaCh7aWQ6IGNoaWxkLnZhbHVlLCBuYW1lOiBjaGlsZC50ZXh0fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZigkKGNoaWxkKS5hdHRyKCdzZWxlY3RlZCcpKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnZhbHVlLnB1c2goY2hpbGQudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBkZWYgPSB7fTtcbiAgICAgICAgICAgIC8vIHNldCB2YWx1ZXMgZnJvbSBET00gY29udGFpbmVyIGVsZW1lbnRcbiAgICAgICAgICAgICQuZWFjaCh0aGlzLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKGksIGF0dCl7XG4gICAgICAgICAgICAgICAgZGVmW2F0dC5uYW1lXSA9IGF0dC5uYW1lID09PSAndmFsdWUnICYmIGF0dC52YWx1ZSAhPT0gJycgPyBKU09OLnBhcnNlKGF0dC52YWx1ZSkgOiBhdHQudmFsdWU7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIGZpZWxkID0gbmV3IE1hZ2ljU3VnZ2VzdCh0aGlzLCAkLmV4dGVuZChbXSwgJC5mbi5tYWdpY1N1Z2dlc3QuZGVmYXVsdHMsIG9wdGlvbnMsIGRlZikpO1xuICAgICAgICAgICAgY250ci5kYXRhKCdtYWdpY1N1Z2dlc3QnLCBmaWVsZCk7XG4gICAgICAgICAgICBmaWVsZC5jb250YWluZXIuZGF0YSgnbWFnaWNTdWdnZXN0JywgZmllbGQpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZihvYmouc2l6ZSgpID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqLmRhdGEoJ21hZ2ljU3VnZ2VzdCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfTtcblxuICAgJC5mbi5tYWdpY1N1Z2dlc3QuZGVmYXVsdHMgPSB7fTtcbn0pKGpRdWVyeSk7XG4iXX0=
