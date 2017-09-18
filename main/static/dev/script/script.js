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
    return $('html.resource-upload').each(function() {
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


$('#keywords').tagsinput({
    confirmKeys: [13, 32, 44],
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

$( document ).ready(function() {
    localStorage.clear();
});


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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1vbi9hcGkuY29mZmVlIiwiY29tbW9uL3VwbG9hZC5jb2ZmZWUiLCJjb21tb24vdXRpbC5jb2ZmZWUiLCJzaXRlL2FwcC5jb2ZmZWUiLCJzaXRlL2F1dGguY29mZmVlIiwic2l0ZS9wcmV0dHktZmlsZS5jb2ZmZWUiLCJzaXRlL3Jlc291cmNlLmNvZmZlZSIsInNpdGUvdXNlci5jb2ZmZWUiLCJsb2FkLmpzIiwic2l0ZS9uaWNvbGFzYml6ZS1tYWdpY3N1Z2dlc3QtMjMwYjA4Yi9tYWdpY3N1Z2dlc3QtbWluLmpzIiwic2l0ZS9uaWNvbGFzYml6ZS1tYWdpY3N1Z2dlc3QtMjMwYjA4Yi9tYWdpY3N1Z2dlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQSxNQUFNLENBQUMsUUFBUCxHQUFrQixTQUFDLE1BQUQsRUFBUyxHQUFULEVBQWMsTUFBZCxFQUFzQixJQUF0QixFQUE0QixRQUE1QjtBQUNoQixRQUFBO0lBQUEsUUFBQSxHQUFXLFFBQUEsSUFBWSxJQUFaLElBQW9CO0lBQy9CLElBQUEsR0FBTyxJQUFBLElBQVE7SUFDZixJQUFHLFNBQVMsQ0FBQyxNQUFWLEtBQW9CLENBQXZCO01BQ0UsSUFBQSxHQUFPLE9BRFQ7O0lBRUEsSUFBRyxTQUFTLENBQUMsTUFBVixLQUFxQixDQUF4QjtNQUNFLE1BQUEsR0FBUztNQUNULElBQUEsR0FBTyxPQUZUOztJQUdBLE1BQUEsR0FBUyxNQUFBLElBQVU7QUFDbkIsU0FBQSxXQUFBOztNQUNFLElBQXdCLFNBQXhCO1FBQUEsT0FBTyxNQUFPLENBQUEsQ0FBQSxFQUFkOztBQURGO0lBRUEsU0FBQSxHQUFlLEdBQUcsQ0FBQyxNQUFKLENBQVcsS0FBWCxDQUFBLElBQXFCLENBQXhCLEdBQStCLEdBQS9CLEdBQXdDO1dBQ3BELENBQUMsQ0FBQyxJQUFGLENBQ0U7TUFBQSxJQUFBLEVBQU0sTUFBTjtNQUNBLEdBQUEsRUFBSyxFQUFBLEdBQUcsR0FBSCxHQUFTLFNBQVQsR0FBb0IsQ0FBQyxDQUFDLENBQUMsS0FBRixDQUFRLE1BQVIsQ0FBRCxDQUR6QjtNQUVBLFdBQUEsRUFBYSxrQkFGYjtNQUdBLE9BQUEsRUFBUyxrQkFIVDtNQUlBLFFBQUEsRUFBVSxNQUpWO01BS0EsSUFBQSxFQUFTLElBQUgsR0FBYSxJQUFJLENBQUMsU0FBTCxDQUFlLElBQWYsQ0FBYixHQUF1QyxNQUw3QztNQU1BLE9BQUEsRUFBUyxTQUFDLElBQUQ7QUFDUCxZQUFBO1FBQUEsSUFBRyxJQUFJLENBQUMsTUFBTCxLQUFlLFNBQWxCO1VBQ0UsSUFBQSxHQUFPO1VBQ1AsSUFBRyxJQUFJLENBQUMsUUFBUjtZQUNFLElBQUEsR0FBTyxTQUFDLFFBQUQ7cUJBQWMsUUFBQSxDQUFTLE1BQVQsRUFBaUIsSUFBSSxDQUFDLFFBQXRCLEVBQWdDLEVBQWhDLEVBQW9DLFFBQXBDO1lBQWQsRUFEVDs7a0RBRUEsU0FBVSxRQUFXLElBQUksQ0FBQyxRQUFRLGVBSnBDO1NBQUEsTUFBQTtrREFNRSxTQUFVLGVBTlo7O01BRE8sQ0FOVDtNQWNBLEtBQUEsRUFBTyxTQUFDLEtBQUQsRUFBUSxVQUFSLEVBQW9CLFdBQXBCO0FBQ0wsWUFBQTtRQUFBLEtBQUEsR0FDRTtVQUFBLFVBQUEsRUFBWSxZQUFaO1VBQ0EsV0FBQSxFQUFhLFVBRGI7VUFFQSxZQUFBLEVBQWMsV0FGZDtVQUdBLEtBQUEsRUFBTyxLQUhQOztBQUlGO1VBQ0UsSUFBMkMsS0FBSyxDQUFDLFlBQWpEO1lBQUEsS0FBQSxHQUFRLENBQUMsQ0FBQyxTQUFGLENBQVksS0FBSyxDQUFDLFlBQWxCLEVBQVI7V0FERjtTQUFBLGNBQUE7VUFFTTtVQUNKLEtBQUEsR0FBUSxNQUhWOztRQUlBLEdBQUEsQ0FBSSxnQkFBSixFQUFzQixLQUF0QjtnREFDQSxTQUFVO01BWEwsQ0FkUDtLQURGO0VBWmdCO0FBQWxCOzs7QUNBQTtBQUFBLE1BQUE7OztFQUFBLENBQUMsU0FBQTtXQUNPLE1BQU0sQ0FBQztNQUNFLHNCQUFDLE9BQUQ7QUFDWCxZQUFBO1FBRFksSUFBQyxDQUFBLFVBQUQ7Ozs7Ozs7UUFDWixJQUFDLENBQUEsY0FBRCxHQUFrQixJQUFDLENBQUEsT0FBTyxDQUFDO1FBQzNCLElBQUMsQ0FBQSxRQUFELEdBQVksSUFBQyxDQUFBLE9BQU8sQ0FBQztRQUNyQixJQUFDLENBQUEsU0FBRCxHQUFhLElBQUMsQ0FBQSxPQUFPLENBQUM7UUFDdEIsSUFBQyxDQUFBLFVBQUQsR0FBYyxJQUFDLENBQUEsT0FBTyxDQUFDLFVBQVQsSUFBdUIsQ0FBQSxTQUFBLEdBQVUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUExQjtRQUNyQyxJQUFDLENBQUEsZUFBRCxHQUFtQixJQUFDLENBQUEsT0FBTyxDQUFDLGVBQVQsSUFBNEI7UUFDL0MsSUFBQyxDQUFBLGFBQUQsR0FBaUIsSUFBQyxDQUFBLE9BQU8sQ0FBQztRQUMxQixJQUFDLENBQUEsUUFBRCxHQUFZLElBQUMsQ0FBQSxPQUFPLENBQUM7UUFFckIsSUFBQyxDQUFBLFlBQUQsR0FBZ0I7O2FBRVAsQ0FBRSxJQUFYLENBQWdCLFFBQWhCLEVBQTBCLENBQUEsU0FBQSxLQUFBO21CQUFBLFNBQUMsQ0FBRDtxQkFDeEIsS0FBQyxDQUFBLG1CQUFELENBQXFCLENBQXJCO1lBRHdCO1VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUExQjs7UUFHQSxHQUFBLEdBQU0sSUFBSSxjQUFKLENBQUE7UUFDTixJQUFHLHdCQUFBLElBQWdCLEdBQUcsQ0FBQyxNQUF2QjtVQUNFLElBQUMsQ0FBQSxTQUFTLENBQUMsRUFBWCxDQUFjLFVBQWQsRUFBMEIsSUFBQyxDQUFBLGVBQTNCO1VBQ0EsSUFBQyxDQUFBLFNBQVMsQ0FBQyxFQUFYLENBQWMsV0FBZCxFQUEyQixJQUFDLENBQUEsZUFBNUI7VUFDQSxJQUFDLENBQUEsU0FBUyxDQUFDLEVBQVgsQ0FBYyxNQUFkLEVBQXNCLENBQUEsU0FBQSxLQUFBO21CQUFBLFNBQUMsQ0FBRDtxQkFDcEIsS0FBQyxDQUFBLG1CQUFELENBQXFCLENBQXJCO1lBRG9CO1VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF0QjtVQUVBLElBQUMsQ0FBQSxTQUFTLENBQUMsSUFBWCxDQUFBLEVBTEY7O1FBT0EsTUFBTSxDQUFDLGNBQVAsR0FBd0IsQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQTtZQUN0QixJQUFHLCtCQUFBLElBQXNCLEtBQUMsQ0FBQSxZQUFELEdBQWdCLENBQXpDO0FBQ0UscUJBQU8sS0FBQyxDQUFBLGdCQURWOztVQURzQjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUE7TUF0QmI7OzZCQTBCYixlQUFBLEdBQWlCLFNBQUMsQ0FBRDtRQUNmLElBQU8sc0JBQVA7QUFDRSxpQkFERjs7UUFFQSxDQUFDLENBQUMsZUFBRixDQUFBO1FBQ0EsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtRQUNBLElBQUcsQ0FBQyxDQUFDLElBQUYsS0FBVSxVQUFiO2lCQUNFLElBQUMsQ0FBQSxTQUFTLENBQUMsUUFBWCxDQUFvQixZQUFwQixFQURGO1NBQUEsTUFBQTtpQkFHRSxJQUFDLENBQUEsU0FBUyxDQUFDLFdBQVgsQ0FBdUIsWUFBdkIsRUFIRjs7TUFMZTs7NkJBVWpCLG1CQUFBLEdBQXFCLFNBQUMsQ0FBRDtBQUNuQixZQUFBO1FBQUEsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsQ0FBakI7UUFDQSxLQUFBLHNEQUFvQyxDQUFFLGVBQTlCLHFDQUErQyxDQUFFLGVBQWpELDJDQUF3RSxDQUFFO1FBQ2xGLHFCQUFHLEtBQUssQ0FBRSxnQkFBUCxHQUFnQixDQUFuQjtpQkFDRSxJQUFDLENBQUEsWUFBRCxDQUFjLEtBQWQsRUFERjs7TUFIbUI7OzZCQU1yQixZQUFBLEdBQWMsU0FBQyxLQUFEO2VBQ1osSUFBQyxDQUFBLGVBQUQsQ0FBaUIsS0FBSyxDQUFDLE1BQXZCLEVBQStCLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUMsS0FBRCxFQUFRLElBQVI7WUFDN0IsSUFBRyxLQUFIO2NBQ0UsT0FBTyxDQUFDLEdBQVIsQ0FBWSxvQkFBWixFQUFrQyxLQUFsQztBQUNBLHFCQUZGOzttQkFHQSxLQUFDLENBQUEsYUFBRCxDQUFlLEtBQWYsRUFBc0IsSUFBdEIsRUFBNEIsQ0FBNUI7VUFKNkI7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQS9CO01BRFk7OzZCQU9kLGVBQUEsR0FBaUIsU0FBQyxDQUFELEVBQUksUUFBSjtRQUNmLElBQVUsQ0FBQSxJQUFLLENBQWY7QUFBQSxpQkFBQTs7ZUFDQSxRQUFBLENBQVMsS0FBVCxFQUFnQixJQUFDLENBQUEsVUFBakIsRUFBNkI7VUFBQyxLQUFBLEVBQU8sQ0FBUjtTQUE3QixFQUF5QyxTQUFDLEtBQUQsRUFBUSxNQUFSO1VBQ3ZDLElBQUcsS0FBSDtZQUNFLFFBQUEsQ0FBUyxLQUFUO0FBQ0Esa0JBQU0sTUFGUjs7aUJBR0EsUUFBQSxDQUFTLE1BQVQsRUFBb0IsTUFBcEI7UUFKdUMsQ0FBekM7TUFGZTs7NkJBUWpCLGFBQUEsR0FBZSxTQUFDLEtBQUQsRUFBUSxJQUFSLEVBQWMsQ0FBZDtBQUNiLFlBQUE7UUFBQSxJQUFVLENBQUEsSUFBSyxLQUFLLENBQUMsTUFBckI7QUFBQSxpQkFBQTs7ZUFDQSxJQUFDLENBQUEsV0FBRCxDQUFhLEtBQU0sQ0FBQSxDQUFBLENBQW5CLEVBQXVCLElBQUssQ0FBQSxDQUFBLENBQUUsQ0FBQyxVQUEvQiwyQ0FBMEQsQ0FBRSxPQUFqQixDQUF5QixLQUFNLENBQUEsQ0FBQSxDQUEvQixVQUEzQyxFQUErRSxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFBO21CQUM3RSxLQUFDLENBQUEsYUFBRCxDQUFlLEtBQWYsRUFBc0IsSUFBdEIsRUFBNEIsQ0FBQSxHQUFJLENBQWhDLEVBQW1DLDRCQUFuQztVQUQ2RTtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBL0U7TUFGYTs7NkJBS2YsV0FBQSxHQUFhLFNBQUMsSUFBRCxFQUFPLEdBQVAsRUFBWSxRQUFaLEVBQXNCLFFBQXRCO0FBQ1gsWUFBQTtRQUFBLEdBQUEsR0FBTSxJQUFJLGNBQUosQ0FBQTtRQUNOLDZDQUFpQixDQUFFLGdCQUFoQixHQUF5QixDQUE1QjtVQUNFLFdBQUcsSUFBSSxDQUFDLElBQUwsRUFBQSxhQUFpQixJQUFDLENBQUEsYUFBbEIsRUFBQSxJQUFBLEtBQUg7WUFDRSxRQUFBLENBQVMsQ0FBVCxFQUFZLE1BQVosRUFBdUIsWUFBdkI7WUFDQSxRQUFBLENBQUE7QUFDQSxtQkFIRjtXQURGOztRQU1BLElBQUcscUJBQUg7VUFDRSxJQUFHLElBQUksQ0FBQyxJQUFMLEdBQVksSUFBQyxDQUFBLFFBQWhCO1lBQ0UsUUFBQSxDQUFTLENBQVQsRUFBWSxNQUFaLEVBQXVCLFNBQXZCO1lBQ0EsUUFBQSxDQUFBO0FBQ0EsbUJBSEY7V0FERjs7UUFPQSxHQUFHLENBQUMsTUFBTSxDQUFDLGdCQUFYLENBQTRCLFVBQTVCLEVBQXdDLFNBQUMsS0FBRDtpQkFDdEMsUUFBQSxDQUFTLFFBQUEsQ0FBUyxLQUFLLENBQUMsTUFBTixHQUFlLEtBQUssQ0FBQyxLQUFyQixHQUE2QixLQUF0QyxDQUFUO1FBRHNDLENBQXhDO1FBR0EsR0FBRyxDQUFDLGtCQUFKLEdBQXlCLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUMsS0FBRDtBQUN2QixnQkFBQTtZQUFBLElBQUcsR0FBRyxDQUFDLFVBQUosS0FBa0IsQ0FBckI7Y0FDRSxJQUFHLEdBQUcsQ0FBQyxNQUFKLEtBQWMsR0FBakI7Z0JBQ0UsUUFBQSxHQUFXLElBQUksQ0FBQyxLQUFMLENBQVcsR0FBRyxDQUFDLFlBQWY7Z0JBQ1gsUUFBQSxDQUFTLEtBQVQsRUFBZ0IsUUFBUSxDQUFDLE1BQXpCO2dCQUVBLENBQUEsQ0FBRSxRQUFGLENBQVcsQ0FBQyxHQUFaLENBQWdCLENBQUEsQ0FBRSxRQUFGLENBQVcsQ0FBQyxHQUFaLENBQUEsQ0FBQSxHQUFxQixRQUFRLENBQUMsTUFBTSxDQUFDLEVBQXJDLEdBQTBDLEdBQTFEO3VCQUNBLEtBQUMsQ0FBQSxZQUFELElBQWlCLEVBTG5CO2VBQUEsTUFBQTtnQkFPRSxRQUFBLENBQVMsQ0FBVCxFQUFZLE1BQVosRUFBdUIsT0FBdkI7dUJBQ0EsS0FBQyxDQUFBLFlBQUQsSUFBaUIsRUFSbkI7ZUFERjs7VUFEdUI7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO1FBWXpCLEdBQUcsQ0FBQyxJQUFKLENBQVMsTUFBVCxFQUFpQixHQUFqQixFQUFzQixJQUF0QjtRQUNBLElBQUEsR0FBTyxJQUFJLFFBQUosQ0FBQTtRQUNQLElBQUksQ0FBQyxNQUFMLENBQVksTUFBWixFQUFvQixJQUFwQjtRQUNBLEdBQUcsQ0FBQyxJQUFKLENBQVMsSUFBVDtlQUNBLFFBQUEsQ0FBQTtNQWxDVzs7Ozs7RUFoRWhCLENBQUQsQ0FBQSxDQUFBO0FBQUE7OztBQ0FBO0VBQUEsTUFBTSxDQUFDLEdBQVAsR0FBYSxTQUFBO29HQUNYLE9BQU8sQ0FBRSxtQkFBSztFQURIOztFQUliLE1BQU0sQ0FBQyxXQUFQLEdBQXFCLFNBQUE7SUFDbkIsbUJBQUEsQ0FBQTtJQUNBLG1CQUFBLENBQUE7SUFDQSx5QkFBQSxDQUFBO0lBQ0EsU0FBQSxDQUFBO0lBQ0EsaUJBQUEsQ0FBQTtXQUNBLGFBQUEsQ0FBQTtFQU5tQjs7RUFTckIsTUFBTSxDQUFDLG1CQUFQLEdBQTZCLFNBQUE7V0FDM0IsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLEVBQVYsQ0FBYSxPQUFiLEVBQXNCLGNBQXRCLEVBQXNDLFNBQUE7YUFDcEMsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLE1BQVIsQ0FBZSxTQUFmO0lBRG9DLENBQXRDO0VBRDJCOztFQUs3QixNQUFNLENBQUMsbUJBQVAsR0FBNkIsU0FBQTtXQUMzQixDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsRUFBVixDQUFhLE9BQWIsRUFBc0IsY0FBdEIsRUFBc0MsU0FBQTtNQUNwQyxJQUFHLENBQUksT0FBQSxDQUFRLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsU0FBYixDQUFBLElBQTJCLGVBQW5DLENBQVA7ZUFDRSxLQUFLLENBQUMsY0FBTixDQUFBLEVBREY7O0lBRG9DLENBQXRDO0VBRDJCOztFQU03QixNQUFNLENBQUMseUJBQVAsR0FBbUMsU0FBQTtXQUNqQyxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsRUFBVixDQUFhLE9BQWIsRUFBc0Isb0JBQXRCLEVBQTRDLFNBQUE7QUFDMUMsVUFBQTtNQUFBLE9BQUEsR0FBVSxDQUFBLENBQUUsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxRQUFiLENBQUY7TUFDVixPQUFPLENBQUMsS0FBUixDQUFBO01BQ0EsSUFBRyxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsUUFBUixDQUFpQixRQUFqQixDQUFIO2VBQ0UsT0FBTyxDQUFDLElBQVIsQ0FBYSxNQUFiLEVBQXFCLFVBQXJCLEVBREY7T0FBQSxNQUFBO2VBR0UsT0FBTyxDQUFDLElBQVIsQ0FBYSxNQUFiLEVBQXFCLE1BQXJCLEVBSEY7O0lBSDBDLENBQTVDO0VBRGlDOztFQVVuQyxNQUFNLENBQUMsU0FBUCxHQUFtQixTQUFBO0FBQ2pCLFFBQUE7SUFBQSxJQUFHLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxNQUFWLEdBQW1CLENBQXRCO01BQ0UsV0FBQSxHQUFjLFNBQUE7UUFDWixDQUFBLENBQUUsZ0JBQUYsQ0FBbUIsQ0FBQyxJQUFwQixDQUF5QixTQUFBO0FBQ3ZCLGNBQUE7VUFBQSxJQUFBLEdBQU8sTUFBTSxDQUFDLEdBQVAsQ0FBVyxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsSUFBUixDQUFhLFVBQWIsQ0FBWDtVQUNQLElBQUEsR0FBTyxNQUFBLENBQUEsQ0FBUSxDQUFDLElBQVQsQ0FBYyxJQUFkLEVBQXFCLE1BQXJCO1VBQ1AsSUFBRyxJQUFBLEdBQU8sRUFBVjtZQUNFLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsSUFBSSxDQUFDLEtBQUwsQ0FBQSxDQUFZLENBQUMsTUFBYixDQUFvQixZQUFwQixDQUFiLEVBREY7V0FBQSxNQUFBO1lBR0UsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxJQUFJLENBQUMsT0FBTCxDQUFBLENBQWIsRUFIRjs7aUJBSUEsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxPQUFiLEVBQXNCLElBQUksQ0FBQyxLQUFMLENBQUEsQ0FBWSxDQUFDLE1BQWIsQ0FBb0IsZ0NBQXBCLENBQXRCO1FBUHVCLENBQXpCO2VBUUEsVUFBQSxDQUFXLFNBQVMsQ0FBQyxNQUFyQixFQUE2QixJQUFBLEdBQU8sRUFBcEM7TUFUWTthQVVkLFdBQUEsQ0FBQSxFQVhGOztFQURpQjs7RUFlbkIsTUFBTSxDQUFDLGlCQUFQLEdBQTJCLFNBQUE7SUFDekIsQ0FBQSxDQUFFLGtDQUFGLENBQXFDLENBQUMsS0FBdEMsQ0FBNEMsU0FBQTtnRkFDMUMsY0FBYyxDQUFFLE9BQWhCLENBQXdCLG9CQUF4QixFQUE4QyxDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUFBLENBQTlDO0lBRDBDLENBQTVDO0lBR0Esd0VBQUcsY0FBYyxDQUFFLE9BQWhCLENBQXdCLG9CQUF4QixXQUFBLEtBQWlELENBQUEsQ0FBRSxxQkFBRixDQUF3QixDQUFDLElBQXpCLENBQUEsQ0FBcEQ7YUFDRSxDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUFBLEVBREY7O0VBSnlCOztFQVEzQixNQUFNLENBQUMsYUFBUCxHQUF1QixTQUFBO0lBQ3JCLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxFQUFWLENBQWEsT0FBYixFQUFzQixXQUF0QixFQUFtQyxTQUFBO2FBQ2pDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBaEIsR0FBdUIsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxNQUFiO0lBRFUsQ0FBbkM7V0FHQSxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsRUFBVixDQUFhLE9BQWIsRUFBc0IsV0FBdEIsRUFBbUMsU0FBQyxDQUFEO2FBQ2pDLENBQUMsQ0FBQyxlQUFGLENBQUE7SUFEaUMsQ0FBbkM7RUFKcUI7O0VBUXZCLE1BQU0sQ0FBQyxtQkFBUCxHQUE2QixTQUFBO1dBQzNCLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLEtBQXBCLENBQUE7RUFEMkI7O0VBSTdCLE1BQU0sQ0FBQyxpQkFBUCxHQUEyQixTQUFDLE9BQUQsRUFBVSxRQUFWOztNQUFVLFdBQVM7O0lBQzVDLG1CQUFBLENBQUE7SUFDQSxJQUFVLENBQUksT0FBZDtBQUFBLGFBQUE7O1dBRUEsQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsTUFBcEIsQ0FBMkIsNkNBQUEsR0FDcUIsUUFEckIsR0FDOEIsaUhBRDlCLEdBR25CLE9BSG1CLEdBR1gsVUFIaEI7RUFKeUI7O0VBWTNCLE1BQU0sQ0FBQyxVQUFQLEdBQW9CLFNBQUMsTUFBRDtBQUNsQixRQUFBO0FBQUE7QUFBQSxTQUFBLHFDQUFBOztNQUNFLElBQUcsTUFBQSxHQUFTLElBQVo7UUFDRSxJQUFHLE1BQUEsS0FBVSxHQUFiO0FBQ0UsaUJBQVUsTUFBRCxHQUFRLEdBQVIsR0FBVyxPQUR0Qjs7QUFFQSxlQUFTLENBQUMsUUFBQSxDQUFTLE1BQUEsR0FBUyxFQUFsQixDQUFBLEdBQXdCLEVBQXpCLENBQUEsR0FBNEIsR0FBNUIsR0FBK0IsT0FIMUM7O01BSUEsTUFBQSxJQUFVO0FBTFo7RUFEa0I7QUFqRnBCOzs7QUNBQTtFQUFBLENBQUEsQ0FBRSxTQUFBO1dBQ0EsV0FBQSxDQUFBO0VBREEsQ0FBRjs7RUFHQSxDQUFBLENBQUUsU0FBQTtXQUFHLENBQUEsQ0FBRSxXQUFGLENBQWMsQ0FBQyxJQUFmLENBQW9CLFNBQUE7YUFDdkIsU0FBQSxDQUFBO0lBRHVCLENBQXBCO0VBQUgsQ0FBRjs7RUFHQSxDQUFBLENBQUUsU0FBQTtXQUFHLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLElBQXBCLENBQXlCLFNBQUE7YUFDNUIsY0FBQSxDQUFBO0lBRDRCLENBQXpCO0VBQUgsQ0FBRjs7RUFHQSxDQUFBLENBQUUsU0FBQTtXQUFHLENBQUEsQ0FBRSxpQkFBRixDQUFvQixDQUFDLElBQXJCLENBQTBCLFNBQUE7YUFDN0IsZUFBQSxDQUFBO0lBRDZCLENBQTFCO0VBQUgsQ0FBRjs7RUFHQSxDQUFBLENBQUUsU0FBQTtXQUFHLENBQUEsQ0FBRSxvQkFBRixDQUF1QixDQUFDLElBQXhCLENBQTZCLFNBQUE7YUFDaEMsa0JBQUEsQ0FBQTtJQURnQyxDQUE3QjtFQUFILENBQUY7O0VBR0EsQ0FBQSxDQUFFLFNBQUE7V0FBRyxDQUFBLENBQUUsb0JBQUYsQ0FBdUIsQ0FBQyxJQUF4QixDQUE2QixTQUFBO2FBQ2hDLGtCQUFBLENBQUE7SUFEZ0MsQ0FBN0I7RUFBSCxDQUFGOztFQUdBLENBQUEsQ0FBRSxTQUFBO1dBQUcsQ0FBQSxDQUFFLHNCQUFGLENBQXlCLENBQUMsSUFBMUIsQ0FBK0IsU0FBQTthQUNsQyxvQkFBQSxDQUFBO0lBRGtDLENBQS9CO0VBQUgsQ0FBRjtBQWxCQTs7O0FDQUE7RUFBQSxNQUFNLENBQUMsU0FBUCxHQUFtQixTQUFBO0lBQ2pCLENBQUEsQ0FBRSxXQUFGLENBQWMsQ0FBQyxNQUFmLENBQXNCLFNBQUE7QUFDcEIsVUFBQTtNQUFBLE9BQUEsR0FBVSxDQUFBLENBQUUsYUFBRixDQUFnQixDQUFDLE9BQWpCLENBQUEsQ0FBMEIsQ0FBQyxNQUEzQixDQUFrQyxDQUFBLENBQUUsa0JBQUYsQ0FBcUIsQ0FBQyxPQUF0QixDQUFBLENBQWxDO0FBQ1Y7V0FBQSx5Q0FBQTs7UUFDRSxJQUFBLEdBQU8sQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLElBQVYsQ0FBZSxNQUFmO1FBQ1AsSUFBRyxDQUFBLENBQUUsaUJBQUYsQ0FBb0IsQ0FBQyxFQUFyQixDQUF3QixVQUF4QixDQUFIO1VBQ0UsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLElBQVYsQ0FBZSxNQUFmLEVBQTBCLElBQUQsR0FBTSxnQkFBL0I7dUJBQ0EsQ0FBQSxDQUFFLFdBQUYsQ0FBYyxDQUFDLElBQWYsQ0FBb0IsU0FBcEIsRUFBK0IsSUFBL0IsR0FGRjtTQUFBLE1BQUE7VUFJRSxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsSUFBVixDQUFlLE1BQWYsRUFBdUIsSUFBSSxDQUFDLE9BQUwsQ0FBYSxnQkFBYixFQUErQixFQUEvQixDQUF2Qjt1QkFDQSxDQUFBLENBQUUsV0FBRixDQUFjLENBQUMsSUFBZixDQUFvQixTQUFwQixFQUErQixLQUEvQixHQUxGOztBQUZGOztJQUZvQixDQUF0QjtXQVdBLENBQUEsQ0FBRSxXQUFGLENBQWMsQ0FBQyxNQUFmLENBQUE7RUFaaUI7QUFBbkI7OztBQ0NBO0VBQUEsSUFBRyxDQUFBLENBQUUsY0FBRixDQUFpQixDQUFDLE1BQXJCO0lBQ0UsQ0FBQSxDQUFFLGNBQUYsQ0FBaUIsQ0FBQyxJQUFsQixDQUF1QixTQUFBO0FBQ3JCLFVBQUE7TUFBQSxXQUFBLEdBQWMsQ0FBQSxDQUFFLElBQUY7TUFDZCxVQUFBLEdBQWEsV0FBVyxDQUFDLElBQVosQ0FBaUIsb0JBQWpCO01BQ2IsVUFBVSxDQUFDLElBQVgsQ0FBQTtNQUNBLFVBQVUsQ0FBQyxNQUFYLENBQWtCLFNBQUE7QUFDaEIsWUFBQTtRQUFBLEtBQUEsR0FBUSxVQUFXLENBQUEsQ0FBQSxDQUFFLENBQUM7UUFDdEIsSUFBQSxHQUFPO1FBQ1AsSUFBRyxLQUFLLENBQUMsTUFBTixHQUFlLENBQWxCO1VBQ0UsSUFBQSxHQUFVLEtBQUssQ0FBQyxNQUFQLEdBQWMsa0JBRHpCO1NBQUEsTUFBQTtVQUdFLElBQUEsR0FBTyxVQUFVLENBQUMsR0FBWCxDQUFBLENBQWdCLENBQUMsS0FBakIsQ0FBdUIsSUFBdkI7VUFDUCxJQUFBLEdBQU8sSUFBSyxDQUFBLElBQUksQ0FBQyxNQUFMLEdBQWMsQ0FBZCxFQUpkOztlQUtBLFdBQVcsQ0FBQyxJQUFaLENBQWlCLG9CQUFqQixDQUFzQyxDQUFDLEdBQXZDLENBQTJDLElBQTNDO01BUmdCLENBQWxCO2FBU0EsV0FBVyxDQUFDLElBQVosQ0FBaUIsY0FBakIsQ0FBZ0MsQ0FBQyxLQUFqQyxDQUF1QyxTQUFDLENBQUQ7UUFDckMsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtRQUNBLFVBQVUsQ0FBQyxLQUFYLENBQUE7ZUFDQSxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsSUFBUixDQUFBO01BSHFDLENBQXZDO0lBYnFCLENBQXZCLEVBREY7O0FBQUE7OztBQ0RBO0FBQUEsTUFBQTs7RUFBQSxNQUFNLENBQUMsa0JBQVAsR0FBNEIsU0FBQTtXQUMxQiwyQkFBQSxDQUFBO0VBRDBCOztFQUc1QixNQUFNLENBQUMsa0JBQVAsR0FBNEIsU0FBQTtXQUMxQiwyQkFBQSxDQUFBO0VBRDBCOztFQUc1QixNQUFNLENBQUMsb0JBQVAsR0FBOEIsU0FBQTtJQUM1QixJQUFHLE1BQU0sQ0FBQyxJQUFQLElBQWdCLE1BQU0sQ0FBQyxRQUF2QixJQUFvQyxNQUFNLENBQUMsVUFBOUM7YUFDRSxNQUFNLENBQUMsYUFBUCxHQUF1QixJQUFJLFlBQUosQ0FDckI7UUFBQSxjQUFBLEVBQWdCLGNBQWhCO1FBQ0EsUUFBQSxFQUFVLENBQUEsQ0FBRSxPQUFGLENBRFY7UUFFQSxTQUFBLEVBQVcsQ0FBQSxDQUFFLFlBQUYsQ0FGWDtRQUdBLGVBQUEsRUFBaUIsaUNBSGpCO1FBSUEsVUFBQSxFQUFZLENBQUEsQ0FBRSxPQUFGLENBQVUsQ0FBQyxJQUFYLENBQWdCLGdCQUFoQixDQUpaO1FBS0EsYUFBQSxFQUFlLEVBTGY7UUFNQSxRQUFBLEVBQVUsSUFBQSxHQUFPLElBQVAsR0FBYyxJQU54QjtPQURxQixFQUR6Qjs7RUFENEI7O0VBVzlCLGNBQUEsR0FDRTtJQUFBLE9BQUEsRUFBUyxTQUFDLElBQUQ7QUFDUCxVQUFBO01BQUEsU0FBQSxHQUFZLENBQUEsQ0FBRSwrSEFBQSxHQUlBLElBQUksQ0FBQyxJQUpMLEdBSVUsNktBSlo7TUFZWixRQUFBLEdBQVcsQ0FBQSxDQUFFLFVBQUYsRUFBYyxTQUFkO01BRVgsSUFBRyxhQUFhLENBQUMsWUFBZCxHQUE2QixFQUE3QixJQUFvQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQVYsQ0FBa0IsT0FBbEIsQ0FBQSxLQUE4QixDQUFyRTtRQUNFLE1BQUEsR0FBUyxJQUFJLFVBQUosQ0FBQTtRQUNULE1BQU0sQ0FBQyxNQUFQLEdBQWdCLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUMsQ0FBRDttQkFDZCxRQUFRLENBQUMsR0FBVCxDQUFhLGtCQUFiLEVBQWlDLE1BQUEsR0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQWhCLEdBQXVCLEdBQXhEO1VBRGM7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO1FBRWhCLE1BQU0sQ0FBQyxhQUFQLENBQXFCLElBQXJCLEVBSkY7T0FBQSxNQUFBO1FBTUUsUUFBUSxDQUFDLElBQVQsQ0FBYyxJQUFJLENBQUMsSUFBTCxJQUFhLDBCQUEzQixFQU5GOztNQVFBLENBQUEsQ0FBRSxtQkFBRixDQUFzQixDQUFDLE9BQXZCLENBQStCLFNBQS9CO2FBRUEsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLFFBQUQsRUFBVyxRQUFYLEVBQXFCLEtBQXJCO1VBQ0UsSUFBRyxLQUFIO1lBQ0UsQ0FBQSxDQUFFLGVBQUYsRUFBbUIsU0FBbkIsQ0FBNkIsQ0FBQyxHQUE5QixDQUFrQyxPQUFsQyxFQUEyQyxNQUEzQztZQUNBLENBQUEsQ0FBRSxlQUFGLEVBQW1CLFNBQW5CLENBQTZCLENBQUMsUUFBOUIsQ0FBdUMscUJBQXZDO1lBQ0EsSUFBRyxLQUFBLEtBQVMsU0FBWjtjQUNFLENBQUEsQ0FBRSxnQkFBRixFQUFvQixTQUFwQixDQUE4QixDQUFDLElBQS9CLENBQW9DLHdCQUFBLEdBQXdCLENBQUMsVUFBQSxDQUFXLGFBQWEsQ0FBQyxRQUF6QixDQUFELENBQXhCLEdBQTRELEdBQWhHLEVBREY7YUFBQSxNQUVLLElBQUcsS0FBQSxLQUFTLFlBQVo7Y0FDSCxDQUFBLENBQUUsZ0JBQUYsRUFBb0IsU0FBcEIsQ0FBOEIsQ0FBQyxJQUEvQixDQUFvQywwQkFBcEMsRUFERzthQUFBLE1BQUE7Y0FHSCxDQUFBLENBQUUsZ0JBQUYsRUFBb0IsU0FBcEIsQ0FBOEIsQ0FBQyxJQUEvQixDQUFvQyxTQUFwQyxFQUhHOztBQUlMLG1CQVRGOztVQVdBLElBQUcsUUFBQSxLQUFZLEtBQVosSUFBc0IsUUFBekI7WUFDRSxDQUFBLENBQUUsZUFBRixFQUFtQixTQUFuQixDQUE2QixDQUFDLFFBQTlCLENBQXVDLHNCQUF2QztZQUNBLENBQUEsQ0FBRSxnQkFBRixFQUFvQixTQUFwQixDQUE4QixDQUFDLElBQS9CLENBQW9DLFVBQUEsR0FBVSxDQUFDLFVBQUEsQ0FBVyxJQUFJLENBQUMsSUFBaEIsQ0FBRCxDQUE5QztZQUNBLElBQUcsUUFBUSxDQUFDLFNBQVQsSUFBdUIsUUFBUSxDQUFDLElBQVQsQ0FBQSxDQUFlLENBQUMsTUFBaEIsR0FBeUIsQ0FBbkQ7Y0FDRSxRQUFRLENBQUMsR0FBVCxDQUFhLGtCQUFiLEVBQWlDLE1BQUEsR0FBTyxRQUFRLENBQUMsU0FBaEIsR0FBMEIsR0FBM0Q7cUJBQ0EsUUFBUSxDQUFDLElBQVQsQ0FBYyxFQUFkLEVBRkY7YUFIRjtXQUFBLE1BTUssSUFBRyxRQUFBLEtBQVksS0FBZjtZQUNILENBQUEsQ0FBRSxlQUFGLEVBQW1CLFNBQW5CLENBQTZCLENBQUMsR0FBOUIsQ0FBa0MsT0FBbEMsRUFBMkMsTUFBM0M7bUJBQ0EsQ0FBQSxDQUFFLGdCQUFGLEVBQW9CLFNBQXBCLENBQThCLENBQUMsSUFBL0IsQ0FBb0MscUJBQXBDLEVBRkc7V0FBQSxNQUFBO1lBSUgsQ0FBQSxDQUFFLGVBQUYsRUFBbUIsU0FBbkIsQ0FBNkIsQ0FBQyxHQUE5QixDQUFrQyxPQUFsQyxFQUE4QyxRQUFELEdBQVUsR0FBdkQ7bUJBQ0EsQ0FBQSxDQUFFLGdCQUFGLEVBQW9CLFNBQXBCLENBQThCLENBQUMsSUFBL0IsQ0FBdUMsUUFBRCxHQUFVLE9BQVYsR0FBZ0IsQ0FBQyxVQUFBLENBQVcsSUFBSSxDQUFDLElBQWhCLENBQUQsQ0FBdEQsRUFMRzs7UUFsQlA7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO0lBekJPLENBQVQ7OztFQW1ERixNQUFNLENBQUMsMkJBQVAsR0FBcUMsU0FBQTtXQUNuQyxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsRUFBVixDQUFhLE9BQWIsRUFBc0IsYUFBdEIsRUFBcUMsU0FBQyxDQUFEO01BQ25DLENBQUMsQ0FBQyxjQUFGLENBQUE7TUFDQSxJQUFHLE9BQUEsQ0FBUSxpQ0FBUixDQUFIO1FBQ0UsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxVQUFiLEVBQXlCLFVBQXpCO2VBQ0EsUUFBQSxDQUFTLFFBQVQsRUFBbUIsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxTQUFiLENBQW5CLEVBQTRDLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUMsR0FBRCxFQUFNLE1BQU47QUFDMUMsZ0JBQUE7WUFBQSxJQUFHLEdBQUg7Y0FDRSxDQUFBLENBQUUsS0FBRixDQUFPLENBQUMsVUFBUixDQUFtQixVQUFuQjtjQUNBLEdBQUEsQ0FBSSw4Q0FBSixFQUFvRCxHQUFwRDtBQUNBLHFCQUhGOztZQUlBLE1BQUEsR0FBUyxDQUFBLENBQUUsS0FBRixDQUFPLENBQUMsSUFBUixDQUFhLFFBQWI7WUFDVCxZQUFBLEdBQWUsQ0FBQSxDQUFFLEtBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxjQUFiO1lBQ2YsSUFBRyxNQUFIO2NBQ0UsQ0FBQSxDQUFFLEVBQUEsR0FBRyxNQUFMLENBQWMsQ0FBQyxNQUFmLENBQUEsRUFERjs7WUFFQSxJQUFHLFlBQUg7cUJBQ0UsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFoQixHQUF1QixhQUR6Qjs7VUFUMEM7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTVDLEVBRkY7O0lBRm1DLENBQXJDO0VBRG1DO0FBckVyQzs7O0FDQUE7QUFBQSxNQUFBOztFQUFBLE1BQU0sQ0FBQyxjQUFQLEdBQXdCLFNBQUE7SUFDdEIsb0JBQUEsQ0FBQTtJQUNBLG9CQUFBLENBQUE7V0FDQSxtQkFBQSxDQUFBO0VBSHNCOztFQU14QixvQkFBQSxHQUF1QixTQUFBO0lBQ3JCLENBQUEsQ0FBRSxxQkFBRixDQUF3QixDQUFDLElBQXpCLENBQThCLFNBQUE7YUFDNUIsZUFBQSxDQUFnQixDQUFBLENBQUUsSUFBRixDQUFoQjtJQUQ0QixDQUE5QjtJQUdBLENBQUEsQ0FBRSxhQUFGLENBQWdCLENBQUMsTUFBakIsQ0FBd0IsU0FBQTtNQUN0QixDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUE4QixTQUE5QixFQUF5QyxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsRUFBUixDQUFXLFVBQVgsQ0FBekM7YUFDQSxDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUE4QixTQUFBO2VBQzVCLGVBQUEsQ0FBZ0IsQ0FBQSxDQUFFLElBQUYsQ0FBaEI7TUFENEIsQ0FBOUI7SUFGc0IsQ0FBeEI7V0FLQSxDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxNQUF6QixDQUFnQyxTQUFBO2FBQzlCLGVBQUEsQ0FBZ0IsQ0FBQSxDQUFFLElBQUYsQ0FBaEI7SUFEOEIsQ0FBaEM7RUFUcUI7O0VBYXZCLGVBQUEsR0FBa0IsU0FBQyxRQUFEO0lBQ2hCLHNCQUFBLENBQUE7V0FDQSxDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUE4QixTQUFBO0FBQzVCLFVBQUE7TUFBQSxFQUFBLEdBQUssUUFBUSxDQUFDLEdBQVQsQ0FBQTthQUNMLENBQUEsQ0FBRSxHQUFBLEdBQUksRUFBTixDQUFXLENBQUMsV0FBWixDQUF3QixTQUF4QixFQUFtQyxRQUFRLENBQUMsRUFBVCxDQUFZLFVBQVosQ0FBbkM7SUFGNEIsQ0FBOUI7RUFGZ0I7O0VBT2xCLHNCQUFBLEdBQXlCLFNBQUE7QUFDdkIsUUFBQTtJQUFBLFFBQUEsR0FBVyxDQUFBLENBQUUsNkJBQUYsQ0FBZ0MsQ0FBQztJQUM1QyxDQUFBLENBQUUsZUFBRixDQUFrQixDQUFDLFdBQW5CLENBQStCLFFBQS9CLEVBQXlDLFFBQUEsS0FBWSxDQUFyRDtJQUNBLENBQUEsQ0FBRSxhQUFGLENBQWdCLENBQUMsV0FBakIsQ0FBNkIsUUFBN0IsRUFBdUMsUUFBQSxHQUFXLENBQWxEO0lBQ0EsSUFBRyxRQUFBLEtBQVksQ0FBZjtNQUNFLENBQUEsQ0FBRSxhQUFGLENBQWdCLENBQUMsSUFBakIsQ0FBc0IsZUFBdEIsRUFBdUMsS0FBdkM7YUFDQSxDQUFBLENBQUUsYUFBRixDQUFnQixDQUFDLElBQWpCLENBQXNCLFNBQXRCLEVBQWlDLEtBQWpDLEVBRkY7S0FBQSxNQUdLLElBQUcsQ0FBQSxDQUFFLG1DQUFGLENBQXNDLENBQUMsTUFBdkMsS0FBaUQsQ0FBcEQ7TUFDSCxDQUFBLENBQUUsYUFBRixDQUFnQixDQUFDLElBQWpCLENBQXNCLGVBQXRCLEVBQXVDLEtBQXZDO2FBQ0EsQ0FBQSxDQUFFLGFBQUYsQ0FBZ0IsQ0FBQyxJQUFqQixDQUFzQixTQUF0QixFQUFpQyxJQUFqQyxFQUZHO0tBQUEsTUFBQTthQUlILENBQUEsQ0FBRSxhQUFGLENBQWdCLENBQUMsSUFBakIsQ0FBc0IsZUFBdEIsRUFBdUMsSUFBdkMsRUFKRzs7RUFQa0I7O0VBaUJ6QixvQkFBQSxHQUF1QixTQUFBO1dBQ3JCLENBQUEsQ0FBRSxjQUFGLENBQWlCLENBQUMsS0FBbEIsQ0FBd0IsU0FBQyxDQUFEO0FBQ3RCLFVBQUE7TUFBQSxtQkFBQSxDQUFBO01BQ0EsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtNQUNBLGVBQUEsR0FBa0IsQ0FBQyxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsSUFBUixDQUFhLFNBQWIsQ0FBRCxDQUF3QixDQUFDLE9BQXpCLENBQWlDLFNBQWpDLEVBQTRDLENBQUEsQ0FBRSw2QkFBRixDQUFnQyxDQUFDLE1BQTdFO01BQ2xCLElBQUcsT0FBQSxDQUFRLGVBQVIsQ0FBSDtRQUNFLFNBQUEsR0FBWTtRQUNaLENBQUEsQ0FBRSw2QkFBRixDQUFnQyxDQUFDLElBQWpDLENBQXNDLFNBQUE7VUFDcEMsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxVQUFiLEVBQXlCLElBQXpCO2lCQUNBLFNBQVMsQ0FBQyxJQUFWLENBQWUsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLEdBQVIsQ0FBQSxDQUFmO1FBRm9DLENBQXRDO1FBR0EsVUFBQSxHQUFhLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsU0FBYjtRQUNiLGVBQUEsR0FBa0IsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxTQUFiO1FBQ2xCLGFBQUEsR0FBZ0IsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxPQUFiO2VBQ2hCLFFBQUEsQ0FBUyxRQUFULEVBQW1CLFVBQW5CLEVBQStCO1VBQUMsU0FBQSxFQUFXLFNBQVMsQ0FBQyxJQUFWLENBQWUsR0FBZixDQUFaO1NBQS9CLEVBQWlFLFNBQUMsR0FBRCxFQUFNLE1BQU47VUFDL0QsSUFBRyxHQUFIO1lBQ0UsQ0FBQSxDQUFFLDhCQUFGLENBQWlDLENBQUMsVUFBbEMsQ0FBNkMsVUFBN0M7WUFDQSxpQkFBQSxDQUFrQixhQUFhLENBQUMsT0FBZCxDQUFzQixTQUF0QixFQUFpQyxTQUFTLENBQUMsTUFBM0MsQ0FBbEIsRUFBc0UsUUFBdEU7QUFDQSxtQkFIRjs7aUJBSUEsQ0FBQSxDQUFFLEdBQUEsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFQLENBQVksS0FBWixDQUFELENBQUwsQ0FBMkIsQ0FBQyxPQUE1QixDQUFvQyxTQUFBO1lBQ2xDLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxNQUFSLENBQUE7WUFDQSxzQkFBQSxDQUFBO21CQUNBLGlCQUFBLENBQWtCLGVBQWUsQ0FBQyxPQUFoQixDQUF3QixTQUF4QixFQUFtQyxTQUFTLENBQUMsTUFBN0MsQ0FBbEIsRUFBd0UsU0FBeEU7VUFIa0MsQ0FBcEM7UUFMK0QsQ0FBakUsRUFSRjs7SUFKc0IsQ0FBeEI7RUFEcUI7O0VBMkJ2QixNQUFNLENBQUMsZUFBUCxHQUF5QixTQUFBO0FBQ3ZCLFFBQUE7SUFBQSxTQUFBLEdBQVksQ0FBQSxDQUFFLFlBQUYsQ0FBZSxDQUFDLEdBQWhCLENBQUE7SUFDWixPQUFBLEdBQVUsQ0FBQSxDQUFFLFVBQUYsQ0FBYSxDQUFDLElBQWQsQ0FBbUIsU0FBbkI7SUFDVixRQUFBLENBQVMsS0FBVCxFQUFnQixPQUFoQixFQUF5QjtNQUFDLFNBQUEsRUFBVyxTQUFaO0tBQXpCLEVBQWlELFNBQUMsS0FBRCxFQUFRLE1BQVI7TUFDL0MsSUFBRyxLQUFIO1FBQ0UsR0FBQSxDQUFJLCtCQUFKO0FBQ0EsZUFGRjs7TUFHQSxNQUFNLENBQUMsUUFBUCxHQUFrQjthQUNsQixDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxVQUF6QixDQUFvQyxVQUFwQztJQUwrQyxDQUFqRDtXQU9BLENBQUEsQ0FBRSxxQkFBRixDQUF3QixDQUFDLE1BQXpCLENBQWdDLFNBQUMsS0FBRDtBQUM5QixVQUFBO01BQUEsUUFBQSxHQUFXLENBQUEsQ0FBRSxLQUFLLENBQUMsYUFBUixDQUFzQixDQUFDLEdBQXZCLENBQUE7YUFDWCxtQkFBQSxDQUFvQixRQUFwQjtJQUY4QixDQUFoQztFQVZ1Qjs7RUFlekIsbUJBQUEsR0FBc0IsU0FBQyxRQUFEO0FBQ3BCLFFBQUE7SUFBQSxDQUFBLENBQUUsV0FBRixDQUFjLENBQUMsV0FBZixDQUEyQixTQUEzQixDQUFxQyxDQUFDLFFBQXRDLENBQStDLFFBQS9DO0lBQ0EsQ0FBQSxDQUFFLEdBQUEsR0FBSSxRQUFOLENBQWlCLENBQUMsV0FBbEIsQ0FBOEIsUUFBOUIsQ0FBdUMsQ0FBQyxRQUF4QyxDQUFpRCxTQUFqRDtBQUVBO1NBQUEsMENBQUE7O01BQ0UsSUFBRyxRQUFBLEtBQVksT0FBTyxDQUFDLEdBQXZCO1FBQ0UsQ0FBQSxDQUFFLHNCQUFGLENBQXlCLENBQUMsR0FBMUIsQ0FBOEIsT0FBTyxDQUFDLEdBQXRDO1FBQ0EsQ0FBQSxDQUFFLHNCQUFGLENBQXlCLENBQUMsR0FBMUIsQ0FBOEIsT0FBTyxDQUFDLFFBQXRDO1FBQ0EsQ0FBQSxDQUFFLGtCQUFGLENBQXFCLENBQUMsR0FBdEIsQ0FBMEIsT0FBTyxDQUFDLElBQWxDO1FBQ0EsQ0FBQSxDQUFFLG1CQUFGLENBQXNCLENBQUMsR0FBdkIsQ0FBMkIsT0FBTyxDQUFDLEtBQW5DO0FBQ0EsY0FMRjtPQUFBLE1BQUE7NkJBQUE7O0FBREY7O0VBSm9COztFQWF0QixtQkFBQSxHQUFzQixTQUFBO1dBQ3BCLENBQUEsQ0FBRSxhQUFGLENBQWdCLENBQUMsS0FBakIsQ0FBdUIsU0FBQyxDQUFEO0FBQ3JCLFVBQUE7TUFBQSxDQUFDLENBQUMsY0FBRixDQUFBO01BQ0EsU0FBQSxHQUFZO01BQ1osQ0FBQSxDQUFFLDZCQUFGLENBQWdDLENBQUMsSUFBakMsQ0FBc0MsU0FBQTtlQUNwQyxTQUFTLENBQUMsSUFBVixDQUFlLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxHQUFSLENBQUEsQ0FBZjtNQURvQyxDQUF0QztNQUVBLGNBQUEsR0FBaUIsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxnQkFBYjthQUNqQixNQUFNLENBQUMsUUFBUSxDQUFDLElBQWhCLEdBQTBCLGNBQUQsR0FBZ0IsYUFBaEIsR0FBNEIsQ0FBQyxTQUFTLENBQUMsSUFBVixDQUFlLEdBQWYsQ0FBRDtJQU5oQyxDQUF2QjtFQURvQjtBQWxHdEI7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVGQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzY3JpcHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ3aW5kb3cuYXBpX2NhbGwgPSAobWV0aG9kLCB1cmwsIHBhcmFtcywgZGF0YSwgY2FsbGJhY2spIC0+XG4gIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZGF0YSB8fCBwYXJhbXNcbiAgZGF0YSA9IGRhdGEgfHwgcGFyYW1zXG4gIGlmIGFyZ3VtZW50cy5sZW5ndGggPT0gNFxuICAgIGRhdGEgPSB1bmRlZmluZWRcbiAgaWYgYXJndW1lbnRzLmxlbmd0aCA9PSAgM1xuICAgIHBhcmFtcyA9IHVuZGVmaW5lZFxuICAgIGRhdGEgPSB1bmRlZmluZWRcbiAgcGFyYW1zID0gcGFyYW1zIHx8IHt9XG4gIGZvciBrLCB2IG9mIHBhcmFtc1xuICAgIGRlbGV0ZSBwYXJhbXNba10gaWYgbm90IHY/XG4gIHNlcGFyYXRvciA9IGlmIHVybC5zZWFyY2goJ1xcXFw/JykgPj0gMCB0aGVuICcmJyBlbHNlICc/J1xuICAkLmFqYXhcbiAgICB0eXBlOiBtZXRob2RcbiAgICB1cmw6IFwiI3t1cmx9I3tzZXBhcmF0b3J9I3skLnBhcmFtIHBhcmFtc31cIlxuICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbidcbiAgICBhY2NlcHRzOiAnYXBwbGljYXRpb24vanNvbidcbiAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgZGF0YTogaWYgZGF0YSB0aGVuIEpTT04uc3RyaW5naWZ5KGRhdGEpIGVsc2UgdW5kZWZpbmVkXG4gICAgc3VjY2VzczogKGRhdGEpIC0+XG4gICAgICBpZiBkYXRhLnN0YXR1cyA9PSAnc3VjY2VzcydcbiAgICAgICAgbW9yZSA9IHVuZGVmaW5lZFxuICAgICAgICBpZiBkYXRhLm5leHRfdXJsXG4gICAgICAgICAgbW9yZSA9IChjYWxsYmFjaykgLT4gYXBpX2NhbGwobWV0aG9kLCBkYXRhLm5leHRfdXJsLCB7fSwgY2FsbGJhY2spXG4gICAgICAgIGNhbGxiYWNrPyB1bmRlZmluZWQsIGRhdGEucmVzdWx0LCBtb3JlXG4gICAgICBlbHNlXG4gICAgICAgIGNhbGxiYWNrPyBkYXRhXG4gICAgZXJyb3I6IChqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24pIC0+XG4gICAgICBlcnJvciA9XG4gICAgICAgIGVycm9yX2NvZGU6ICdhamF4X2Vycm9yJ1xuICAgICAgICB0ZXh0X3N0YXR1czogdGV4dFN0YXR1c1xuICAgICAgICBlcnJvcl90aHJvd246IGVycm9yVGhyb3duXG4gICAgICAgIGpxWEhSOiBqcVhIUlxuICAgICAgdHJ5XG4gICAgICAgIGVycm9yID0gJC5wYXJzZUpTT04oanFYSFIucmVzcG9uc2VUZXh0KSBpZiBqcVhIUi5yZXNwb25zZVRleHRcbiAgICAgIGNhdGNoIGVcbiAgICAgICAgZXJyb3IgPSBlcnJvclxuICAgICAgTE9HICdhcGlfY2FsbCBlcnJvcicsIGVycm9yXG4gICAgICBjYWxsYmFjaz8gZXJyb3JcbiIsIigtPlxuICBjbGFzcyB3aW5kb3cuRmlsZVVwbG9hZGVyXG4gICAgY29uc3RydWN0b3I6IChAb3B0aW9ucykgLT5cbiAgICAgIEB1cGxvYWRfaGFuZGxlciA9IEBvcHRpb25zLnVwbG9hZF9oYW5kbGVyXG4gICAgICBAc2VsZWN0b3IgPSBAb3B0aW9ucy5zZWxlY3RvclxuICAgICAgQGRyb3BfYXJlYSA9IEBvcHRpb25zLmRyb3BfYXJlYVxuICAgICAgQHVwbG9hZF91cmwgPSBAb3B0aW9ucy51cGxvYWRfdXJsIG9yIFwiL2FwaS92MSN7d2luZG93LmxvY2F0aW9uLnBhdGhuYW1lfVwiXG4gICAgICBAY29uZmlybV9tZXNzYWdlID0gQG9wdGlvbnMuY29uZmlybV9tZXNzYWdlIG9yICdGaWxlcyBhcmUgc3RpbGwgYmVpbmcgdXBsb2FkZWQuJ1xuICAgICAgQGFsbG93ZWRfdHlwZXMgPSBAb3B0aW9ucy5hbGxvd2VkX3R5cGVzXG4gICAgICBAbWF4X3NpemUgPSBAb3B0aW9ucy5tYXhfc2l6ZVxuXG4gICAgICBAYWN0aXZlX2ZpbGVzID0gMFxuXG4gICAgICBAc2VsZWN0b3I/LmJpbmQgJ2NoYW5nZScsIChlKSA9PlxuICAgICAgICBAZmlsZV9zZWxlY3RfaGFuZGxlcihlKVxuXG4gICAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgICAgaWYgQGRyb3BfYXJlYT8gYW5kIHhoci51cGxvYWRcbiAgICAgICAgQGRyb3BfYXJlYS5vbiAnZHJhZ292ZXInLCBAZmlsZV9kcmFnX2hvdmVyXG4gICAgICAgIEBkcm9wX2FyZWEub24gJ2RyYWdsZWF2ZScsIEBmaWxlX2RyYWdfaG92ZXJcbiAgICAgICAgQGRyb3BfYXJlYS5vbiAnZHJvcCcsIChlKSA9PlxuICAgICAgICAgIEBmaWxlX3NlbGVjdF9oYW5kbGVyIGVcbiAgICAgICAgQGRyb3BfYXJlYS5zaG93KClcblxuICAgICAgd2luZG93Lm9uYmVmb3JldW5sb2FkID0gPT5cbiAgICAgICAgaWYgQGNvbmZpcm1fbWVzc2FnZT8gYW5kIEBhY3RpdmVfZmlsZXMgPiAwXG4gICAgICAgICAgcmV0dXJuIEBjb25maXJtX21lc3NhZ2VcblxuICAgIGZpbGVfZHJhZ19ob3ZlcjogKGUpID0+XG4gICAgICBpZiBub3QgQGRyb3BfYXJlYT9cbiAgICAgICAgcmV0dXJuXG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIGlmIGUudHlwZSBpcyAnZHJhZ292ZXInXG4gICAgICAgIEBkcm9wX2FyZWEuYWRkQ2xhc3MgJ2RyYWctaG92ZXInXG4gICAgICBlbHNlXG4gICAgICAgIEBkcm9wX2FyZWEucmVtb3ZlQ2xhc3MgJ2RyYWctaG92ZXInXG5cbiAgICBmaWxlX3NlbGVjdF9oYW5kbGVyOiAoZSkgPT5cbiAgICAgIEBmaWxlX2RyYWdfaG92ZXIoZSlcbiAgICAgIGZpbGVzID0gZS5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlcj8uZmlsZXMgb3IgZS50YXJnZXQ/LmZpbGVzIG9yIGUuZGF0YVRyYW5zZmVyPy5maWxlc1xuICAgICAgaWYgZmlsZXM/Lmxlbmd0aCA+IDBcbiAgICAgICAgQHVwbG9hZF9maWxlcyhmaWxlcylcblxuICAgIHVwbG9hZF9maWxlczogKGZpbGVzKSA9PlxuICAgICAgQGdldF91cGxvYWRfdXJscyBmaWxlcy5sZW5ndGgsIChlcnJvciwgdXJscykgPT5cbiAgICAgICAgaWYgZXJyb3JcbiAgICAgICAgICBjb25zb2xlLmxvZyAnRXJyb3IgZ2V0dGluZyBVUkxzJywgZXJyb3JcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgQHByb2Nlc3NfZmlsZXMgZmlsZXMsIHVybHMsIDBcblxuICAgIGdldF91cGxvYWRfdXJsczogKG4sIGNhbGxiYWNrKSA9PlxuICAgICAgcmV0dXJuIGlmIG4gPD0gMFxuICAgICAgYXBpX2NhbGwgJ0dFVCcsIEB1cGxvYWRfdXJsLCB7Y291bnQ6IG59LCAoZXJyb3IsIHJlc3VsdCkgLT5cbiAgICAgICAgaWYgZXJyb3JcbiAgICAgICAgICBjYWxsYmFjayBlcnJvclxuICAgICAgICAgIHRocm93IGVycm9yXG4gICAgICAgIGNhbGxiYWNrIHVuZGVmaW5lZCwgcmVzdWx0XG5cbiAgICBwcm9jZXNzX2ZpbGVzOiAoZmlsZXMsIHVybHMsIGkpID0+XG4gICAgICByZXR1cm4gaWYgaSA+PSBmaWxlcy5sZW5ndGhcbiAgICAgIEB1cGxvYWRfZmlsZSBmaWxlc1tpXSwgdXJsc1tpXS51cGxvYWRfdXJsLCBAdXBsb2FkX2hhbmRsZXI/LnByZXZpZXcoZmlsZXNbaV0pLCAoKSA9PlxuICAgICAgICBAcHJvY2Vzc19maWxlcyBmaWxlcywgdXJscywgaSArIDEsIEB1cGxvYWRfaGFuZGxlcj9cblxuICAgIHVwbG9hZF9maWxlOiAoZmlsZSwgdXJsLCBwcm9ncmVzcywgY2FsbGJhY2spID0+XG4gICAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgICAgaWYgQGFsbG93ZWRfdHlwZXM/Lmxlbmd0aCA+IDBcbiAgICAgICAgaWYgZmlsZS50eXBlIG5vdCBpbiBAYWxsb3dlZF90eXBlc1xuICAgICAgICAgIHByb2dyZXNzIDAsIHVuZGVmaW5lZCwgJ3dyb25nX3R5cGUnXG4gICAgICAgICAgY2FsbGJhY2soKVxuICAgICAgICAgIHJldHVyblxuXG4gICAgICBpZiBAbWF4X3NpemU/XG4gICAgICAgIGlmIGZpbGUuc2l6ZSA+IEBtYXhfc2l6ZVxuICAgICAgICAgIHByb2dyZXNzIDAsIHVuZGVmaW5lZCwgJ3Rvb19iaWcnXG4gICAgICAgICAgY2FsbGJhY2soKVxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAjICQoJyNpbWFnZScpLnZhbChmaWxlLm5hbWUpO1xuICAgICAgeGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyICdwcm9ncmVzcycsIChldmVudCkgLT5cbiAgICAgICAgcHJvZ3Jlc3MgcGFyc2VJbnQgZXZlbnQubG9hZGVkIC8gZXZlbnQudG90YWwgKiAxMDAuMFxuXG4gICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gKGV2ZW50KSA9PlxuICAgICAgICBpZiB4aHIucmVhZHlTdGF0ZSA9PSA0XG4gICAgICAgICAgaWYgeGhyLnN0YXR1cyA9PSAyMDBcbiAgICAgICAgICAgIHJlc3BvbnNlID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KVxuICAgICAgICAgICAgcHJvZ3Jlc3MgMTAwLjAsIHJlc3BvbnNlLnJlc3VsdFxuICAgICAgICAgICAgIyAvLyQoJyNjb250ZW50JykudmFsKHhoci5yZXNwb25zZVRleHQpXG4gICAgICAgICAgICAkKCcjaW1hZ2UnKS52YWwoJCgnI2ltYWdlJykudmFsKCkgICsgcmVzcG9uc2UucmVzdWx0LmlkICsgJzsnKTtcbiAgICAgICAgICAgIEBhY3RpdmVfZmlsZXMgLT0gMVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHByb2dyZXNzIDAsIHVuZGVmaW5lZCwgJ2Vycm9yJ1xuICAgICAgICAgICAgQGFjdGl2ZV9maWxlcyAtPSAxXG5cbiAgICAgIHhoci5vcGVuICdQT1NUJywgdXJsLCB0cnVlXG4gICAgICBkYXRhID0gbmV3IEZvcm1EYXRhKClcbiAgICAgIGRhdGEuYXBwZW5kICdmaWxlJywgZmlsZVxuICAgICAgeGhyLnNlbmQgZGF0YVxuICAgICAgY2FsbGJhY2soKVxuKSgpIiwid2luZG93LkxPRyA9IC0+XG4gIGNvbnNvbGU/LmxvZz8gYXJndW1lbnRzLi4uXG5cblxud2luZG93LmluaXRfY29tbW9uID0gLT5cbiAgaW5pdF9sb2FkaW5nX2J1dHRvbigpXG4gIGluaXRfY29uZmlybV9idXR0b24oKVxuICBpbml0X3Bhc3N3b3JkX3Nob3dfYnV0dG9uKClcbiAgaW5pdF90aW1lKClcbiAgaW5pdF9hbm5vdW5jZW1lbnQoKVxuICBpbml0X3Jvd19saW5rKClcblxuXG53aW5kb3cuaW5pdF9sb2FkaW5nX2J1dHRvbiA9IC0+XG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1sb2FkaW5nJywgLT5cbiAgICAkKHRoaXMpLmJ1dHRvbiAnbG9hZGluZydcblxuXG53aW5kb3cuaW5pdF9jb25maXJtX2J1dHRvbiA9IC0+XG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1jb25maXJtJywgLT5cbiAgICBpZiBub3QgY29uZmlybSAkKHRoaXMpLmRhdGEoJ21lc3NhZ2UnKSBvciAnQXJlIHlvdSBzdXJlPydcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcblxuXG53aW5kb3cuaW5pdF9wYXNzd29yZF9zaG93X2J1dHRvbiA9IC0+XG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1wYXNzd29yZC1zaG93JywgLT5cbiAgICAkdGFyZ2V0ID0gJCgkKHRoaXMpLmRhdGEgJ3RhcmdldCcpXG4gICAgJHRhcmdldC5mb2N1cygpXG4gICAgaWYgJCh0aGlzKS5oYXNDbGFzcyAnYWN0aXZlJ1xuICAgICAgJHRhcmdldC5hdHRyICd0eXBlJywgJ3Bhc3N3b3JkJ1xuICAgIGVsc2VcbiAgICAgICR0YXJnZXQuYXR0ciAndHlwZScsICd0ZXh0J1xuXG5cbndpbmRvdy5pbml0X3RpbWUgPSAtPlxuICBpZiAkKCd0aW1lJykubGVuZ3RoID4gMFxuICAgIHJlY2FsY3VsYXRlID0gLT5cbiAgICAgICQoJ3RpbWVbZGF0ZXRpbWVdJykuZWFjaCAtPlxuICAgICAgICBkYXRlID0gbW9tZW50LnV0YyAkKHRoaXMpLmF0dHIgJ2RhdGV0aW1lJ1xuICAgICAgICBkaWZmID0gbW9tZW50KCkuZGlmZiBkYXRlICwgJ2RheXMnXG4gICAgICAgIGlmIGRpZmYgPiAyNVxuICAgICAgICAgICQodGhpcykudGV4dCBkYXRlLmxvY2FsKCkuZm9ybWF0ICdZWVlZLU1NLUREJ1xuICAgICAgICBlbHNlXG4gICAgICAgICAgJCh0aGlzKS50ZXh0IGRhdGUuZnJvbU5vdygpXG4gICAgICAgICQodGhpcykuYXR0ciAndGl0bGUnLCBkYXRlLmxvY2FsKCkuZm9ybWF0ICdkZGRkLCBNTU1NIERvIFlZWVksIEhIOm1tOnNzIFonXG4gICAgICBzZXRUaW1lb3V0IGFyZ3VtZW50cy5jYWxsZWUsIDEwMDAgKiA0NVxuICAgIHJlY2FsY3VsYXRlKClcblxuXG53aW5kb3cuaW5pdF9hbm5vdW5jZW1lbnQgPSAtPlxuICAkKCcuYWxlcnQtYW5ub3VuY2VtZW50IGJ1dHRvbi5jbG9zZScpLmNsaWNrIC0+XG4gICAgc2Vzc2lvblN0b3JhZ2U/LnNldEl0ZW0gJ2Nsb3NlZEFubm91bmNlbWVudCcsICQoJy5hbGVydC1hbm5vdW5jZW1lbnQnKS5odG1sKClcblxuICBpZiBzZXNzaW9uU3RvcmFnZT8uZ2V0SXRlbSgnY2xvc2VkQW5ub3VuY2VtZW50JykgIT0gJCgnLmFsZXJ0LWFubm91bmNlbWVudCcpLmh0bWwoKVxuICAgICQoJy5hbGVydC1hbm5vdW5jZW1lbnQnKS5zaG93KClcblxuXG53aW5kb3cuaW5pdF9yb3dfbGluayA9IC0+XG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLnJvdy1saW5rJywgLT5cbiAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICQodGhpcykuZGF0YSAnaHJlZidcblxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5ub3QtbGluaycsIChlKSAtPlxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcblxuXG53aW5kb3cuY2xlYXJfbm90aWZpY2F0aW9ucyA9IC0+XG4gICQoJyNub3RpZmljYXRpb25zJykuZW1wdHkoKVxuXG5cbndpbmRvdy5zaG93X25vdGlmaWNhdGlvbiA9IChtZXNzYWdlLCBjYXRlZ29yeT0nd2FybmluZycpIC0+XG4gIGNsZWFyX25vdGlmaWNhdGlvbnMoKVxuICByZXR1cm4gaWYgbm90IG1lc3NhZ2VcblxuICAkKCcjbm90aWZpY2F0aW9ucycpLmFwcGVuZCBcIlwiXCJcbiAgICAgIDxkaXYgY2xhc3M9XCJhbGVydCBhbGVydC1kaXNtaXNzYWJsZSBhbGVydC0je2NhdGVnb3J5fVwiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImNsb3NlXCIgZGF0YS1kaXNtaXNzPVwiYWxlcnRcIiBhcmlhLWhpZGRlbj1cInRydWVcIj4mdGltZXM7PC9idXR0b24+XG4gICAgICAgICN7bWVzc2FnZX1cbiAgICAgIDwvZGl2PlxuICAgIFwiXCJcIlxuXG5cbndpbmRvdy5zaXplX2h1bWFuID0gKG5ieXRlcykgLT5cbiAgZm9yIHN1ZmZpeCBpbiBbJ0InLCAnS0InLCAnTUInLCAnR0InLCAnVEInXVxuICAgIGlmIG5ieXRlcyA8IDEwMDBcbiAgICAgIGlmIHN1ZmZpeCA9PSAnQidcbiAgICAgICAgcmV0dXJuIFwiI3tuYnl0ZXN9ICN7c3VmZml4fVwiXG4gICAgICByZXR1cm4gXCIje3BhcnNlSW50KG5ieXRlcyAqIDEwKSAvIDEwfSAje3N1ZmZpeH1cIlxuICAgIG5ieXRlcyAvPSAxMDI0LjBcbiIsIiQgLT5cbiAgaW5pdF9jb21tb24oKVxuXG4kIC0+ICQoJ2h0bWwuYXV0aCcpLmVhY2ggLT5cbiAgaW5pdF9hdXRoKClcblxuJCAtPiAkKCdodG1sLnVzZXItbGlzdCcpLmVhY2ggLT5cbiAgaW5pdF91c2VyX2xpc3QoKVxuXG4kIC0+ICQoJ2h0bWwudXNlci1tZXJnZScpLmVhY2ggLT5cbiAgaW5pdF91c2VyX21lcmdlKClcblxuJCAtPiAkKCdodG1sLnJlc291cmNlLWxpc3QnKS5lYWNoIC0+XG4gIGluaXRfcmVzb3VyY2VfbGlzdCgpXG5cbiQgLT4gJCgnaHRtbC5yZXNvdXJjZS12aWV3JykuZWFjaCAtPlxuICBpbml0X3Jlc291cmNlX3ZpZXcoKVxuXG4kIC0+ICQoJ2h0bWwucmVzb3VyY2UtdXBsb2FkJykuZWFjaCAtPlxuICBpbml0X3Jlc291cmNlX3VwbG9hZCgpIiwid2luZG93LmluaXRfYXV0aCA9IC0+XG4gICQoJy5yZW1lbWJlcicpLmNoYW5nZSAtPlxuICAgIGJ1dHRvbnMgPSAkKCcuYnRuLXNvY2lhbCcpLnRvQXJyYXkoKS5jb25jYXQgJCgnLmJ0bi1zb2NpYWwtaWNvbicpLnRvQXJyYXkoKVxuICAgIGZvciBidXR0b24gaW4gYnV0dG9uc1xuICAgICAgaHJlZiA9ICQoYnV0dG9uKS5wcm9wICdocmVmJ1xuICAgICAgaWYgJCgnLnJlbWVtYmVyIGlucHV0JykuaXMgJzpjaGVja2VkJ1xuICAgICAgICAkKGJ1dHRvbikucHJvcCAnaHJlZicsIFwiI3tocmVmfSZyZW1lbWJlcj10cnVlXCJcbiAgICAgICAgJCgnI3JlbWVtYmVyJykucHJvcCAnY2hlY2tlZCcsIHRydWVcbiAgICAgIGVsc2VcbiAgICAgICAgJChidXR0b24pLnByb3AgJ2hyZWYnLCBocmVmLnJlcGxhY2UgJyZyZW1lbWJlcj10cnVlJywgJydcbiAgICAgICAgJCgnI3JlbWVtYmVyJykucHJvcCAnY2hlY2tlZCcsIGZhbHNlXG5cbiAgJCgnLnJlbWVtYmVyJykuY2hhbmdlKClcbiIsIiMgaHR0cDovL2Jsb2cuYW5vcmdhbi5jb20vMjAxMi8wOS8zMC9wcmV0dHktbXVsdGktZmlsZS11cGxvYWQtYm9vdHN0cmFwLWpxdWVyeS10d2lnLXNpbGV4L1xuaWYgJChcIi5wcmV0dHktZmlsZVwiKS5sZW5ndGhcbiAgJChcIi5wcmV0dHktZmlsZVwiKS5lYWNoICgpIC0+XG4gICAgcHJldHR5X2ZpbGUgPSAkKHRoaXMpXG4gICAgZmlsZV9pbnB1dCA9IHByZXR0eV9maWxlLmZpbmQoJ2lucHV0W3R5cGU9XCJmaWxlXCJdJylcbiAgICBmaWxlX2lucHV0LmhpZGUoKVxuICAgIGZpbGVfaW5wdXQuY2hhbmdlICgpIC0+XG4gICAgICBmaWxlcyA9IGZpbGVfaW5wdXRbMF0uZmlsZXNcbiAgICAgIGluZm8gPSBcIlwiXG4gICAgICBpZiBmaWxlcy5sZW5ndGggPiAxXG4gICAgICAgIGluZm8gPSBcIiN7ZmlsZXMubGVuZ3RofSBmaWxlcyBzZWxlY3RlZFwiXG4gICAgICBlbHNlXG4gICAgICAgIHBhdGggPSBmaWxlX2lucHV0LnZhbCgpLnNwbGl0KFwiXFxcXFwiKVxuICAgICAgICBpbmZvID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdXG4gICAgICBwcmV0dHlfZmlsZS5maW5kKFwiLmlucHV0LWdyb3VwIGlucHV0XCIpLnZhbChpbmZvKVxuICAgIHByZXR0eV9maWxlLmZpbmQoXCIuaW5wdXQtZ3JvdXBcIikuY2xpY2sgKGUpIC0+XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIGZpbGVfaW5wdXQuY2xpY2soKVxuICAgICAgJCh0aGlzKS5ibHVyKClcbiIsIndpbmRvdy5pbml0X3Jlc291cmNlX2xpc3QgPSAoKSAtPlxuICBpbml0X2RlbGV0ZV9yZXNvdXJjZV9idXR0b24oKVxuXG53aW5kb3cuaW5pdF9yZXNvdXJjZV92aWV3ID0gKCkgLT5cbiAgaW5pdF9kZWxldGVfcmVzb3VyY2VfYnV0dG9uKClcblxud2luZG93LmluaXRfcmVzb3VyY2VfdXBsb2FkID0gKCkgLT5cbiAgaWYgd2luZG93LkZpbGUgYW5kIHdpbmRvdy5GaWxlTGlzdCBhbmQgd2luZG93LkZpbGVSZWFkZXJcbiAgICB3aW5kb3cuZmlsZV91cGxvYWRlciA9IG5ldyBGaWxlVXBsb2FkZXJcbiAgICAgIHVwbG9hZF9oYW5kbGVyOiB1cGxvYWRfaGFuZGxlclxuICAgICAgc2VsZWN0b3I6ICQoJy5maWxlJylcbiAgICAgIGRyb3BfYXJlYTogJCgnLmRyb3AtYXJlYScpXG4gICAgICBjb25maXJtX21lc3NhZ2U6ICdGaWxlcyBhcmUgc3RpbGwgYmVpbmcgdXBsb2FkZWQuJ1xuICAgICAgdXBsb2FkX3VybDogJCgnLmZpbGUnKS5kYXRhKCdnZXQtdXBsb2FkLXVybCcpXG4gICAgICBhbGxvd2VkX3R5cGVzOiBbXVxuICAgICAgbWF4X3NpemU6IDEwMjQgKiAxMDI0ICogMTAyNFxuXG51cGxvYWRfaGFuZGxlciA9XG4gIHByZXZpZXc6IChmaWxlKSAtPlxuICAgICRyZXNvdXJjZSA9ICQgXCJcIlwiXG4gICAgICAgIDxkaXYgY2xhc3M9XCJjb2wtbGctMiBjb2wtbWQtMyBjb2wtc20tNCBjb2wteHMtNlwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJ0aHVtYm5haWxcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmV2aWV3XCI+PC9kaXY+XG4gICAgICAgICAgICA8aDU+I3tmaWxlLm5hbWV9PC9oNT5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzc1wiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3MtYmFyXCIgc3R5bGU9XCJ3aWR0aDogMCU7XCI+PC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzcy10ZXh0XCI+PC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICBcIlwiXCJcbiAgICAkcHJldmlldyA9ICQoJy5wcmV2aWV3JywgJHJlc291cmNlKVxuXG4gICAgaWYgZmlsZV91cGxvYWRlci5hY3RpdmVfZmlsZXMgPCAxNiBhbmQgZmlsZS50eXBlLmluZGV4T2YoXCJpbWFnZVwiKSBpcyAwXG4gICAgICByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgICByZWFkZXIub25sb2FkID0gKGUpID0+XG4gICAgICAgICRwcmV2aWV3LmNzcygnYmFja2dyb3VuZC1pbWFnZScsIFwidXJsKCN7ZS50YXJnZXQucmVzdWx0fSlcIilcbiAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKGZpbGUpXG4gICAgZWxzZVxuICAgICAgJHByZXZpZXcudGV4dChmaWxlLnR5cGUgb3IgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScpXG5cbiAgICAkKCcucmVzb3VyY2UtdXBsb2FkcycpLnByZXBlbmQoJHJlc291cmNlKVxuXG4gICAgKHByb2dyZXNzLCByZXNvdXJjZSwgZXJyb3IpID0+XG4gICAgICBpZiBlcnJvclxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5jc3MoJ3dpZHRoJywgJzEwMCUnKVxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5hZGRDbGFzcygncHJvZ3Jlc3MtYmFyLWRhbmdlcicpXG4gICAgICAgIGlmIGVycm9yID09ICd0b29fYmlnJ1xuICAgICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiRmFpbGVkISBUb28gYmlnLCBtYXg6ICN7c2l6ZV9odW1hbihmaWxlX3VwbG9hZGVyLm1heF9zaXplKX0uXCIpXG4gICAgICAgIGVsc2UgaWYgZXJyb3IgPT0gJ3dyb25nX3R5cGUnXG4gICAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCJGYWlsZWQhIFdyb25nIGZpbGUgdHlwZS5cIilcbiAgICAgICAgZWxzZVxuICAgICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KCdGYWlsZWQhJylcbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIGlmIHByb2dyZXNzID09IDEwMC4wIGFuZCByZXNvdXJjZVxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5hZGRDbGFzcygncHJvZ3Jlc3MtYmFyLXN1Y2Nlc3MnKVxuICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIlN1Y2Nlc3MgI3tzaXplX2h1bWFuKGZpbGUuc2l6ZSl9XCIpXG4gICAgICAgIGlmIHJlc291cmNlLmltYWdlX3VybCBhbmQgJHByZXZpZXcudGV4dCgpLmxlbmd0aCA+IDBcbiAgICAgICAgICAkcHJldmlldy5jc3MoJ2JhY2tncm91bmQtaW1hZ2UnLCBcInVybCgje3Jlc291cmNlLmltYWdlX3VybH0pXCIpXG4gICAgICAgICAgJHByZXZpZXcudGV4dCgnJylcbiAgICAgIGVsc2UgaWYgcHJvZ3Jlc3MgPT0gMTAwLjBcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuY3NzKCd3aWR0aCcsICcxMDAlJylcbiAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCIxMDAlIC0gUHJvY2Vzc2luZy4uXCIpXG4gICAgICBlbHNlXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmNzcygnd2lkdGgnLCBcIiN7cHJvZ3Jlc3N9JVwiKVxuICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIiN7cHJvZ3Jlc3N9JSBvZiAje3NpemVfaHVtYW4oZmlsZS5zaXplKX1cIilcblxuXG53aW5kb3cuaW5pdF9kZWxldGVfcmVzb3VyY2VfYnV0dG9uID0gKCkgLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWRlbGV0ZScsIChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIGlmIGNvbmZpcm0oJ1ByZXNzIE9LIHRvIGRlbGV0ZSB0aGUgcmVzb3VyY2UnKVxuICAgICAgJCh0aGlzKS5hdHRyKCdkaXNhYmxlZCcsICdkaXNhYmxlZCcpXG4gICAgICBhcGlfY2FsbCAnREVMRVRFJywgJCh0aGlzKS5kYXRhKCdhcGktdXJsJyksIChlcnIsIHJlc3VsdCkgPT5cbiAgICAgICAgaWYgZXJyXG4gICAgICAgICAgJCh0aGlzKS5yZW1vdmVBdHRyKCdkaXNhYmxlZCcpXG4gICAgICAgICAgTE9HICdTb21ldGhpbmcgd2VudCB0ZXJyaWJseSB3cm9uZyBkdXJpbmcgZGVsZXRlIScsIGVyclxuICAgICAgICAgIHJldHVyblxuICAgICAgICB0YXJnZXQgPSAkKHRoaXMpLmRhdGEoJ3RhcmdldCcpXG4gICAgICAgIHJlZGlyZWN0X3VybCA9ICQodGhpcykuZGF0YSgncmVkaXJlY3QtdXJsJylcbiAgICAgICAgaWYgdGFyZ2V0XG4gICAgICAgICAgJChcIiN7dGFyZ2V0fVwiKS5yZW1vdmUoKVxuICAgICAgICBpZiByZWRpcmVjdF91cmxcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlZGlyZWN0X3VybCIsIndpbmRvdy5pbml0X3VzZXJfbGlzdCA9IC0+XG4gIGluaXRfdXNlcl9zZWxlY3Rpb25zKClcbiAgaW5pdF91c2VyX2RlbGV0ZV9idG4oKVxuICBpbml0X3VzZXJfbWVyZ2VfYnRuKClcblxuXG5pbml0X3VzZXJfc2VsZWN0aW9ucyA9IC0+XG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5lYWNoIC0+XG4gICAgdXNlcl9zZWxlY3Rfcm93ICQodGhpcylcblxuICAkKCcjc2VsZWN0LWFsbCcpLmNoYW5nZSAtPlxuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5wcm9wICdjaGVja2VkJywgJCh0aGlzKS5pcyAnOmNoZWNrZWQnXG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cbiAgICAgIHVzZXJfc2VsZWN0X3JvdyAkKHRoaXMpXG5cbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmNoYW5nZSAtPlxuICAgIHVzZXJfc2VsZWN0X3JvdyAkKHRoaXMpXG5cblxudXNlcl9zZWxlY3Rfcm93ID0gKCRlbGVtZW50KSAtPlxuICB1cGRhdGVfdXNlcl9zZWxlY3Rpb25zKClcbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cbiAgICBpZCA9ICRlbGVtZW50LnZhbCgpXG4gICAgJChcIiMje2lkfVwiKS50b2dnbGVDbGFzcyAnd2FybmluZycsICRlbGVtZW50LmlzICc6Y2hlY2tlZCdcblxuXG51cGRhdGVfdXNlcl9zZWxlY3Rpb25zID0gLT5cbiAgc2VsZWN0ZWQgPSAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5sZW5ndGhcbiAgJCgnI3VzZXItYWN0aW9ucycpLnRvZ2dsZUNsYXNzICdoaWRkZW4nLCBzZWxlY3RlZCA9PSAwXG4gICQoJyN1c2VyLW1lcmdlJykudG9nZ2xlQ2xhc3MgJ2hpZGRlbicsIHNlbGVjdGVkIDwgMlxuICBpZiBzZWxlY3RlZCBpcyAwXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdpbmRldGVybWluYXRlJywgZmFsc2VcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2NoZWNrZWQnLCBmYWxzZVxuICBlbHNlIGlmICQoJ2lucHV0W25hbWU9dXNlcl9kYl06bm90KDpjaGVja2VkKScpLmxlbmd0aCBpcyAwXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdpbmRldGVybWluYXRlJywgZmFsc2VcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2NoZWNrZWQnLCB0cnVlXG4gIGVsc2VcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCB0cnVlXG5cblxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBEZWxldGUgVXNlcnMgU3R1ZmZcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbmluaXRfdXNlcl9kZWxldGVfYnRuID0gLT5cbiAgJCgnI3VzZXItZGVsZXRlJykuY2xpY2sgKGUpIC0+XG4gICAgY2xlYXJfbm90aWZpY2F0aW9ucygpXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgY29uZmlybV9tZXNzYWdlID0gKCQodGhpcykuZGF0YSAnY29uZmlybScpLnJlcGxhY2UgJ3t1c2Vyc30nLCAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5sZW5ndGhcbiAgICBpZiBjb25maXJtIGNvbmZpcm1fbWVzc2FnZVxuICAgICAgdXNlcl9rZXlzID0gW11cbiAgICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmVhY2ggLT5cbiAgICAgICAgJCh0aGlzKS5hdHRyICdkaXNhYmxlZCcsIHRydWVcbiAgICAgICAgdXNlcl9rZXlzLnB1c2ggJCh0aGlzKS52YWwoKVxuICAgICAgZGVsZXRlX3VybCA9ICQodGhpcykuZGF0YSAnYXBpLXVybCdcbiAgICAgIHN1Y2Nlc3NfbWVzc2FnZSA9ICQodGhpcykuZGF0YSAnc3VjY2VzcydcbiAgICAgIGVycm9yX21lc3NhZ2UgPSAkKHRoaXMpLmRhdGEgJ2Vycm9yJ1xuICAgICAgYXBpX2NhbGwgJ0RFTEVURScsIGRlbGV0ZV91cmwsIHt1c2VyX2tleXM6IHVzZXJfa2V5cy5qb2luKCcsJyl9LCAoZXJyLCByZXN1bHQpIC0+XG4gICAgICAgIGlmIGVyclxuICAgICAgICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl06ZGlzYWJsZWQnKS5yZW1vdmVBdHRyICdkaXNhYmxlZCdcbiAgICAgICAgICBzaG93X25vdGlmaWNhdGlvbiBlcnJvcl9tZXNzYWdlLnJlcGxhY2UoJ3t1c2Vyc30nLCB1c2VyX2tleXMubGVuZ3RoKSwgJ2RhbmdlcidcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgJChcIiMje3Jlc3VsdC5qb2luKCcsICMnKX1cIikuZmFkZU91dCAtPlxuICAgICAgICAgICQodGhpcykucmVtb3ZlKClcbiAgICAgICAgICB1cGRhdGVfdXNlcl9zZWxlY3Rpb25zKClcbiAgICAgICAgICBzaG93X25vdGlmaWNhdGlvbiBzdWNjZXNzX21lc3NhZ2UucmVwbGFjZSgne3VzZXJzfScsIHVzZXJfa2V5cy5sZW5ndGgpLCAnc3VjY2VzcydcblxuXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIE1lcmdlIFVzZXJzIFN0dWZmXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG53aW5kb3cuaW5pdF91c2VyX21lcmdlID0gLT5cbiAgdXNlcl9rZXlzID0gJCgnI3VzZXJfa2V5cycpLnZhbCgpXG4gIGFwaV91cmwgPSAkKCcuYXBpLXVybCcpLmRhdGEgJ2FwaS11cmwnXG4gIGFwaV9jYWxsICdHRVQnLCBhcGlfdXJsLCB7dXNlcl9rZXlzOiB1c2VyX2tleXN9LCAoZXJyb3IsIHJlc3VsdCkgLT5cbiAgICBpZiBlcnJvclxuICAgICAgTE9HICdTb21ldGhpbmcgd2VudCB0ZXJyaWJseSB3cm9uZydcbiAgICAgIHJldHVyblxuICAgIHdpbmRvdy51c2VyX2RicyA9IHJlc3VsdFxuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5yZW1vdmVBdHRyICdkaXNhYmxlZCdcblxuICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykuY2hhbmdlIChldmVudCkgLT5cbiAgICB1c2VyX2tleSA9ICQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKClcbiAgICBzZWxlY3RfZGVmYXVsdF91c2VyIHVzZXJfa2V5XG5cblxuc2VsZWN0X2RlZmF1bHRfdXNlciA9ICh1c2VyX2tleSkgLT5cbiAgJCgnLnVzZXItcm93JykucmVtb3ZlQ2xhc3MoJ3N1Y2Nlc3MnKS5hZGRDbGFzcyAnZGFuZ2VyJ1xuICAkKFwiIyN7dXNlcl9rZXl9XCIpLnJlbW92ZUNsYXNzKCdkYW5nZXInKS5hZGRDbGFzcyAnc3VjY2VzcydcblxuICBmb3IgdXNlcl9kYiBpbiB1c2VyX2Ric1xuICAgIGlmIHVzZXJfa2V5ID09IHVzZXJfZGIua2V5XG4gICAgICAkKCdpbnB1dFtuYW1lPXVzZXJfa2V5XScpLnZhbCB1c2VyX2RiLmtleVxuICAgICAgJCgnaW5wdXRbbmFtZT11c2VybmFtZV0nKS52YWwgdXNlcl9kYi51c2VybmFtZVxuICAgICAgJCgnaW5wdXRbbmFtZT1uYW1lXScpLnZhbCB1c2VyX2RiLm5hbWVcbiAgICAgICQoJ2lucHV0W25hbWU9ZW1haWxdJykudmFsIHVzZXJfZGIuZW1haWxcbiAgICAgIGJyZWFrXG5cblxuaW5pdF91c2VyX21lcmdlX2J0biA9IC0+XG4gICQoJyN1c2VyLW1lcmdlJykuY2xpY2sgKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgdXNlcl9rZXlzID0gW11cbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5lYWNoIC0+XG4gICAgICB1c2VyX2tleXMucHVzaCAkKHRoaXMpLnZhbCgpXG4gICAgdXNlcl9tZXJnZV91cmwgPSAkKHRoaXMpLmRhdGEgJ3VzZXItbWVyZ2UtdXJsJ1xuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gXCIje3VzZXJfbWVyZ2VfdXJsfT91c2VyX2tleXM9I3t1c2VyX2tleXMuam9pbignLCcpfVwiXG4iLCJcbnZhciBrZXl3b3JkcyA9IG5ldyBCbG9vZGhvdW5kKHtcbiAgICBkYXR1bVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLm9iai53aGl0ZXNwYWNlKCduYW1lJyksXG4gICAgcXVlcnlUb2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy53aGl0ZXNwYWNlLFxuICAgIHByZWZldGNoOiB7XG4gICAgdXJsOiAnL2tleXdvcmRzJyxcbiAgICBmaWx0ZXI6IGZ1bmN0aW9uKGxpc3QpIHtcbiAgICAgIHJldHVybiAkLm1hcChsaXN0LCBmdW5jdGlvbihjaXR5bmFtZSkge1xuICAgICAgICByZXR1cm4geyBuYW1lOiBjaXR5bmFtZSB9OyB9KTtcbiAgICB9XG4gIH1cblxufSk7XG5cbmtleXdvcmRzLmluaXRpYWxpemUoKTtcblxuJCgnI3NlYXJjaCcpLnR5cGVhaGVhZChudWxsLCB7XG4gICAgIG1pbmxlbmd0aDogMSxcbiAgICAgbmFtZTogJ2tleXdvcmRzJyxcbiAgICAgZGlzcGxheUtleTogJ25hbWUnLFxuICAgICB2YWx1ZUtleTogJ25hbWUnLFxuICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXG59KTtcblxuXG4kKCcja2V5d29yZHMnKS50YWdzaW5wdXQoe1xuICAgIGNvbmZpcm1LZXlzOiBbMTMsIDMyLCA0NF0sXG4gICAgdHlwZWFoZWFkanM6IFt7XG4gICAgICAgICAgbWluTGVuZ3RoOiAxLFxuICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZSxcblxuICAgIH0se1xuICAgICAgICBtaW5sZW5ndGg6IDEsXG4gICAgICAgIG5hbWU6ICdrZXl3b3JkcycsXG4gICAgICAgIGRpc3BsYXlLZXk6ICduYW1lJyxcbiAgICAgICAgdmFsdWVLZXk6ICduYW1lJyxcbiAgICAgICAgc291cmNlOiBrZXl3b3Jkcy50dEFkYXB0ZXIoKVxuICAgIH1dLFxuICAgIGZyZWVJbnB1dDogdHJ1ZSxcblxufSk7XG5cbiQoIGRvY3VtZW50ICkucmVhZHkoZnVuY3Rpb24oKSB7XG4gICAgbG9jYWxTdG9yYWdlLmNsZWFyKCk7XG59KTtcblxuXG5mdW5jdGlvbiBzdGFyRnVuY3Rpb24oeCwgeSkge1xuXG4gICAgYXBpX3VybCA9ICcvYXBpL3YxL3N0YXIvJyArIHkgKyAnLyc7XG5cbiAgICBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcImZhLXN0YXItb1wiKSl7XG4gICAgICAgICBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcIm5vdC1sb2dnZWQtaW5cIikpe1xuLy8gICAgICAgICAgICAkKFwiI2xvZ2luZm9ybVwiKS5jc3Moe1widmlzaWJpbGl0eVwiOlwidmlzaWJsZVwiLFwiZGlzcGxheVwiOlwiYmxvY2tcIn0pO1xuICAgICAgICAgICAgJChcIiNyZXN0YXVyYW50XCIpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcbiAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmZhZGVJbigpO1xuLy8gICAgICAgICAgICAkKFwiI3Jlc3RhdXJhbnRcIikuZmFkZU91dCgpO1xuICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgeC5jbGFzc0xpc3QucmVtb3ZlKFwiZmEtc3Rhci1vXCIpXG4gICAgICAgICAgICB4LmNsYXNzTGlzdC5hZGQoXCJmYS1zdGFyXCIpXG4gICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBhcGlfdXJsLCAgICAvL1lvdXIgYXBpIHVybFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ1BVVCcsICAgLy90eXBlIGlzIGFueSBIVFRQIG1ldGhvZFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAgICAgIC8vRGF0YSBhcyBqcyBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwiZmEtc3RhclwiKSl7XG5cbiAgICAgICAgeC5jbGFzc0xpc3QucmVtb3ZlKFwiZmEtc3RhclwiKVxuICAgICAgICB4LmNsYXNzTGlzdC5hZGQoXCJmYS1zdGFyLW9cIilcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBhcGlfdXJsLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnREVMRVRFJyxcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEbyBzb21ldGhpbmcgd2l0aCB0aGUgcmVzdWx0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIDtcbiAgICB9XG5cbn1cblxuJCgnLmNsb3NlLWljb24nKS5vbignY2xpY2snLGZ1bmN0aW9uKCkge1xuICAkKHRoaXMpLmNsb3Nlc3QoJy5jYXJkJykuY3NzKHtcImRpc3BsYXlcIjpcIm5vbmVcIn0pO1xuICAkKFwiI3Jlc3RhdXJhbnRcIikuZmFkZUluKCk7XG59KSIsIihmdW5jdGlvbigkKXtcInVzZSBzdHJpY3RcIjt2YXIgTWFnaWNTdWdnZXN0PWZ1bmN0aW9uKGVsZW1lbnQsb3B0aW9ucyl7dmFyIG1zPXRoaXM7dmFyIGRlZmF1bHRzPXthbGxvd0ZyZWVFbnRyaWVzOnRydWUsYWxsb3dEdXBsaWNhdGVzOmZhbHNlLGFqYXhDb25maWc6e30sYXV0b1NlbGVjdDp0cnVlLHNlbGVjdEZpcnN0OmZhbHNlLHF1ZXJ5UGFyYW06XCJxdWVyeVwiLGJlZm9yZVNlbmQ6ZnVuY3Rpb24oKXt9LGNsczpcIlwiLGRhdGE6bnVsbCxkYXRhVXJsUGFyYW1zOnt9LGRpc2FibGVkOmZhbHNlLGRpc2FibGVkRmllbGQ6bnVsbCxkaXNwbGF5RmllbGQ6XCJuYW1lXCIsZWRpdGFibGU6dHJ1ZSxleHBhbmRlZDpmYWxzZSxleHBhbmRPbkZvY3VzOmZhbHNlLGdyb3VwQnk6bnVsbCxoaWRlVHJpZ2dlcjpmYWxzZSxoaWdobGlnaHQ6dHJ1ZSxpZDpudWxsLGluZm9Nc2dDbHM6XCJcIixpbnB1dENmZzp7fSxpbnZhbGlkQ2xzOlwibXMtaW52XCIsbWF0Y2hDYXNlOmZhbHNlLG1heERyb3BIZWlnaHQ6MjkwLG1heEVudHJ5TGVuZ3RoOm51bGwsbWF4RW50cnlSZW5kZXJlcjpmdW5jdGlvbih2KXtyZXR1cm5cIlBsZWFzZSByZWR1Y2UgeW91ciBlbnRyeSBieSBcIit2K1wiIGNoYXJhY3RlclwiKyh2PjE/XCJzXCI6XCJcIil9LG1heFN1Z2dlc3Rpb25zOm51bGwsbWF4U2VsZWN0aW9uOjEwLG1heFNlbGVjdGlvblJlbmRlcmVyOmZ1bmN0aW9uKHYpe3JldHVyblwiWW91IGNhbm5vdCBjaG9vc2UgbW9yZSB0aGFuIFwiK3YrXCIgaXRlbVwiKyh2PjE/XCJzXCI6XCJcIil9LG1ldGhvZDpcIlBPU1RcIixtaW5DaGFyczowLG1pbkNoYXJzUmVuZGVyZXI6ZnVuY3Rpb24odil7cmV0dXJuXCJQbGVhc2UgdHlwZSBcIit2K1wiIG1vcmUgY2hhcmFjdGVyXCIrKHY+MT9cInNcIjpcIlwiKX0sbW9kZTpcImxvY2FsXCIsbmFtZTpudWxsLG5vU3VnZ2VzdGlvblRleHQ6XCJObyBzdWdnZXN0aW9uc1wiLHBsYWNlaG9sZGVyOlwiVHlwZSBvciBjbGljayBoZXJlXCIscmVuZGVyZXI6bnVsbCxyZXF1aXJlZDpmYWxzZSxyZXN1bHRBc1N0cmluZzpmYWxzZSxyZXN1bHRBc1N0cmluZ0RlbGltaXRlcjpcIixcIixyZXN1bHRzRmllbGQ6XCJyZXN1bHRzXCIsc2VsZWN0aW9uQ2xzOlwiXCIsc2VsZWN0aW9uQ29udGFpbmVyOm51bGwsc2VsZWN0aW9uUG9zaXRpb246XCJpbm5lclwiLHNlbGVjdGlvblJlbmRlcmVyOm51bGwsc2VsZWN0aW9uU3RhY2tlZDpmYWxzZSxzb3J0RGlyOlwiYXNjXCIsc29ydE9yZGVyOm51bGwsc3RyaWN0U3VnZ2VzdDpmYWxzZSxzdHlsZTpcIlwiLHRvZ2dsZU9uQ2xpY2s6ZmFsc2UsdHlwZURlbGF5OjQwMCx1c2VUYWJLZXk6ZmFsc2UsdXNlQ29tbWFLZXk6dHJ1ZSx1c2VaZWJyYVN0eWxlOmZhbHNlLHZhbHVlOm51bGwsdmFsdWVGaWVsZDpcImlkXCIsdnJlZ2V4Om51bGwsdnR5cGU6bnVsbH07dmFyIGNvbmY9JC5leHRlbmQoe30sb3B0aW9ucyk7dmFyIGNmZz0kLmV4dGVuZCh0cnVlLHt9LGRlZmF1bHRzLGNvbmYpO3RoaXMuYWRkVG9TZWxlY3Rpb249ZnVuY3Rpb24oaXRlbXMsaXNTaWxlbnQpe2lmKCFjZmcubWF4U2VsZWN0aW9ufHxfc2VsZWN0aW9uLmxlbmd0aDxjZmcubWF4U2VsZWN0aW9uKXtpZighJC5pc0FycmF5KGl0ZW1zKSl7aXRlbXM9W2l0ZW1zXX12YXIgdmFsdWVjaGFuZ2VkPWZhbHNlOyQuZWFjaChpdGVtcyxmdW5jdGlvbihpbmRleCxqc29uKXtpZihjZmcuYWxsb3dEdXBsaWNhdGVzfHwkLmluQXJyYXkoanNvbltjZmcudmFsdWVGaWVsZF0sbXMuZ2V0VmFsdWUoKSk9PT0tMSl7X3NlbGVjdGlvbi5wdXNoKGpzb24pO3ZhbHVlY2hhbmdlZD10cnVlfX0pO2lmKHZhbHVlY2hhbmdlZD09PXRydWUpe3NlbGYuX3JlbmRlclNlbGVjdGlvbigpO3RoaXMuZW1wdHkoKTtpZihpc1NpbGVudCE9PXRydWUpeyQodGhpcykudHJpZ2dlcihcInNlbGVjdGlvbmNoYW5nZVwiLFt0aGlzLHRoaXMuZ2V0U2VsZWN0aW9uKCldKX19fXRoaXMuaW5wdXQuYXR0cihcInBsYWNlaG9sZGVyXCIsY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiJiZ0aGlzLmdldFZhbHVlKCkubGVuZ3RoPjA/XCJcIjpjZmcucGxhY2Vob2xkZXIpfTt0aGlzLmNsZWFyPWZ1bmN0aW9uKGlzU2lsZW50KXt0aGlzLnJlbW92ZUZyb21TZWxlY3Rpb24oX3NlbGVjdGlvbi5zbGljZSgwKSxpc1NpbGVudCl9O3RoaXMuY29sbGFwc2U9ZnVuY3Rpb24oKXtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXt0aGlzLmNvbWJvYm94LmRldGFjaCgpO2NmZy5leHBhbmRlZD1mYWxzZTskKHRoaXMpLnRyaWdnZXIoXCJjb2xsYXBzZVwiLFt0aGlzXSl9fTt0aGlzLmRpc2FibGU9ZnVuY3Rpb24oKXt0aGlzLmNvbnRhaW5lci5hZGRDbGFzcyhcIm1zLWN0bi1kaXNhYmxlZFwiKTtjZmcuZGlzYWJsZWQ9dHJ1ZTttcy5pbnB1dC5hdHRyKFwiZGlzYWJsZWRcIix0cnVlKX07dGhpcy5lbXB0eT1mdW5jdGlvbigpe3RoaXMuaW5wdXQudmFsKFwiXCIpfTt0aGlzLmVuYWJsZT1mdW5jdGlvbigpe3RoaXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKFwibXMtY3RuLWRpc2FibGVkXCIpO2NmZy5kaXNhYmxlZD1mYWxzZTttcy5pbnB1dC5hdHRyKFwiZGlzYWJsZWRcIixmYWxzZSl9O3RoaXMuZXhwYW5kPWZ1bmN0aW9uKCl7aWYoIWNmZy5leHBhbmRlZCYmKHRoaXMuaW5wdXQudmFsKCkubGVuZ3RoPj1jZmcubWluQ2hhcnN8fHRoaXMuY29tYm9ib3guY2hpbGRyZW4oKS5zaXplKCk+MCkpe3RoaXMuY29tYm9ib3guYXBwZW5kVG8odGhpcy5jb250YWluZXIpO3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO2NmZy5leHBhbmRlZD10cnVlOyQodGhpcykudHJpZ2dlcihcImV4cGFuZFwiLFt0aGlzXSl9fTt0aGlzLmlzRGlzYWJsZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gY2ZnLmRpc2FibGVkfTt0aGlzLmlzVmFsaWQ9ZnVuY3Rpb24oKXt2YXIgdmFsaWQ9Y2ZnLnJlcXVpcmVkPT09ZmFsc2V8fF9zZWxlY3Rpb24ubGVuZ3RoPjA7aWYoY2ZnLnZ0eXBlfHxjZmcudnJlZ2V4KXskLmVhY2goX3NlbGVjdGlvbixmdW5jdGlvbihpbmRleCxpdGVtKXt2YWxpZD12YWxpZCYmc2VsZi5fdmFsaWRhdGVTaW5nbGVJdGVtKGl0ZW1bY2ZnLnZhbHVlRmllbGRdKX0pfXJldHVybiB2YWxpZH07dGhpcy5nZXREYXRhVXJsUGFyYW1zPWZ1bmN0aW9uKCl7cmV0dXJuIGNmZy5kYXRhVXJsUGFyYW1zfTt0aGlzLmdldE5hbWU9ZnVuY3Rpb24oKXtyZXR1cm4gY2ZnLm5hbWV9O3RoaXMuZ2V0U2VsZWN0aW9uPWZ1bmN0aW9uKCl7cmV0dXJuIF9zZWxlY3Rpb259O3RoaXMuZ2V0UmF3VmFsdWU9ZnVuY3Rpb24oKXtyZXR1cm4gbXMuaW5wdXQudmFsKCl9O3RoaXMuZ2V0VmFsdWU9ZnVuY3Rpb24oKXtyZXR1cm4gJC5tYXAoX3NlbGVjdGlvbixmdW5jdGlvbihvKXtyZXR1cm4gb1tjZmcudmFsdWVGaWVsZF19KX07dGhpcy5yZW1vdmVGcm9tU2VsZWN0aW9uPWZ1bmN0aW9uKGl0ZW1zLGlzU2lsZW50KXtpZighJC5pc0FycmF5KGl0ZW1zKSl7aXRlbXM9W2l0ZW1zXX12YXIgdmFsdWVjaGFuZ2VkPWZhbHNlOyQuZWFjaChpdGVtcyxmdW5jdGlvbihpbmRleCxqc29uKXt2YXIgaT0kLmluQXJyYXkoanNvbltjZmcudmFsdWVGaWVsZF0sbXMuZ2V0VmFsdWUoKSk7aWYoaT4tMSl7X3NlbGVjdGlvbi5zcGxpY2UoaSwxKTt2YWx1ZWNoYW5nZWQ9dHJ1ZX19KTtpZih2YWx1ZWNoYW5nZWQ9PT10cnVlKXtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtpZihpc1NpbGVudCE9PXRydWUpeyQodGhpcykudHJpZ2dlcihcInNlbGVjdGlvbmNoYW5nZVwiLFt0aGlzLHRoaXMuZ2V0U2VsZWN0aW9uKCldKX1pZihjZmcuZXhwYW5kT25Gb2N1cyl7bXMuZXhwYW5kKCl9aWYoY2ZnLmV4cGFuZGVkKXtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKX19dGhpcy5pbnB1dC5hdHRyKFwicGxhY2Vob2xkZXJcIixjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJnRoaXMuZ2V0VmFsdWUoKS5sZW5ndGg+MD9cIlwiOmNmZy5wbGFjZWhvbGRlcil9O3RoaXMuZ2V0RGF0YT1mdW5jdGlvbigpe3JldHVybiBfY2JEYXRhfTt0aGlzLnNldERhdGE9ZnVuY3Rpb24oZGF0YSl7Y2ZnLmRhdGE9ZGF0YTtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKX07dGhpcy5zZXROYW1lPWZ1bmN0aW9uKG5hbWUpe2NmZy5uYW1lPW5hbWU7aWYobmFtZSl7Y2ZnLm5hbWUrPW5hbWUuaW5kZXhPZihcIltdXCIpPjA/XCJcIjpcIltdXCJ9aWYobXMuX3ZhbHVlQ29udGFpbmVyKXskLmVhY2gobXMuX3ZhbHVlQ29udGFpbmVyLmNoaWxkcmVuKCksZnVuY3Rpb24oaSxlbCl7ZWwubmFtZT1jZmcubmFtZX0pfX07dGhpcy5zZXRTZWxlY3Rpb249ZnVuY3Rpb24oaXRlbXMpe3RoaXMuY2xlYXIoKTt0aGlzLmFkZFRvU2VsZWN0aW9uKGl0ZW1zKX07dGhpcy5zZXRWYWx1ZT1mdW5jdGlvbih2YWx1ZXMpe3ZhciBpdGVtcz1bXTskLmVhY2godmFsdWVzLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXt2YXIgZm91bmQ9ZmFsc2U7JC5lYWNoKF9jYkRhdGEsZnVuY3Rpb24oaSxpdGVtKXtpZihpdGVtW2NmZy52YWx1ZUZpZWxkXT09dmFsdWUpe2l0ZW1zLnB1c2goaXRlbSk7Zm91bmQ9dHJ1ZTtyZXR1cm4gZmFsc2V9fSk7aWYoIWZvdW5kKXtpZih0eXBlb2YgdmFsdWU9PT1cIm9iamVjdFwiKXtpdGVtcy5wdXNoKHZhbHVlKX1lbHNle3ZhciBqc29uPXt9O2pzb25bY2ZnLnZhbHVlRmllbGRdPXZhbHVlO2pzb25bY2ZnLmRpc3BsYXlGaWVsZF09dmFsdWU7aXRlbXMucHVzaChqc29uKX19fSk7aWYoaXRlbXMubGVuZ3RoPjApe3RoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpfX07dGhpcy5zZXREYXRhVXJsUGFyYW1zPWZ1bmN0aW9uKHBhcmFtcyl7Y2ZnLmRhdGFVcmxQYXJhbXM9JC5leHRlbmQoe30scGFyYW1zKX07dmFyIF9zZWxlY3Rpb249W10sX2NvbWJvSXRlbUhlaWdodD0wLF90aW1lcixfaGFzRm9jdXM9ZmFsc2UsX2dyb3Vwcz1udWxsLF9jYkRhdGE9W10sX2N0cmxEb3duPWZhbHNlLEtFWUNPREVTPXtCQUNLU1BBQ0U6OCxUQUI6OSxFTlRFUjoxMyxDVFJMOjE3LEVTQzoyNyxTUEFDRTozMixVUEFSUk9XOjM4LERPV05BUlJPVzo0MCxDT01NQToxODh9O3ZhciBzZWxmPXtfZGlzcGxheVN1Z2dlc3Rpb25zOmZ1bmN0aW9uKGRhdGEpe21zLmNvbWJvYm94LnNob3coKTttcy5jb21ib2JveC5lbXB0eSgpO3ZhciByZXNIZWlnaHQ9MCxuYkdyb3Vwcz0wO2lmKF9ncm91cHM9PT1udWxsKXtzZWxmLl9yZW5kZXJDb21ib0l0ZW1zKGRhdGEpO3Jlc0hlaWdodD1fY29tYm9JdGVtSGVpZ2h0KmRhdGEubGVuZ3RofWVsc2V7Zm9yKHZhciBncnBOYW1lIGluIF9ncm91cHMpe25iR3JvdXBzKz0xOyQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtcmVzLWdyb3VwXCIsaHRtbDpncnBOYW1lfSkuYXBwZW5kVG8obXMuY29tYm9ib3gpO3NlbGYuX3JlbmRlckNvbWJvSXRlbXMoX2dyb3Vwc1tncnBOYW1lXS5pdGVtcyx0cnVlKX12YXIgX2dyb3VwSXRlbUhlaWdodD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1ncm91cFwiKS5vdXRlckhlaWdodCgpO2lmKF9ncm91cEl0ZW1IZWlnaHQhPT1udWxsKXt2YXIgdG1wUmVzSGVpZ2h0PW5iR3JvdXBzKl9ncm91cEl0ZW1IZWlnaHQ7cmVzSGVpZ2h0PV9jb21ib0l0ZW1IZWlnaHQqZGF0YS5sZW5ndGgrdG1wUmVzSGVpZ2h0fWVsc2V7cmVzSGVpZ2h0PV9jb21ib0l0ZW1IZWlnaHQqKGRhdGEubGVuZ3RoK25iR3JvdXBzKX19aWYocmVzSGVpZ2h0PG1zLmNvbWJvYm94LmhlaWdodCgpfHxyZXNIZWlnaHQ8PWNmZy5tYXhEcm9wSGVpZ2h0KXttcy5jb21ib2JveC5oZWlnaHQocmVzSGVpZ2h0KX1lbHNlIGlmKHJlc0hlaWdodD49bXMuY29tYm9ib3guaGVpZ2h0KCkmJnJlc0hlaWdodD5jZmcubWF4RHJvcEhlaWdodCl7bXMuY29tYm9ib3guaGVpZ2h0KGNmZy5tYXhEcm9wSGVpZ2h0KX1pZihkYXRhLmxlbmd0aD09PTEmJmNmZy5hdXRvU2VsZWN0PT09dHJ1ZSl7bXMuY29tYm9ib3guY2hpbGRyZW4oKS5maWx0ZXIoXCI6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6bGFzdFwiKS5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKX1pZihjZmcuc2VsZWN0Rmlyc3Q9PT10cnVlKXttcy5jb21ib2JveC5jaGlsZHJlbigpLmZpbHRlcihcIjpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdFwiKS5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKX1pZihkYXRhLmxlbmd0aD09PTAmJm1zLmdldFJhd1ZhbHVlKCkhPT1cIlwiKXt2YXIgbm9TdWdnZXN0aW9uVGV4dD1jZmcubm9TdWdnZXN0aW9uVGV4dC5yZXBsYWNlKC9cXHtcXHsuKlxcfVxcfS8sbXMuaW5wdXQudmFsKCkpO3NlbGYuX3VwZGF0ZUhlbHBlcihub1N1Z2dlc3Rpb25UZXh0KTttcy5jb2xsYXBzZSgpfWlmKGNmZy5hbGxvd0ZyZWVFbnRyaWVzPT09ZmFsc2Upe2lmKGRhdGEubGVuZ3RoPT09MCl7JChtcy5pbnB1dCkuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpO21zLmNvbWJvYm94LmhpZGUoKX1lbHNleyQobXMuaW5wdXQpLnJlbW92ZUNsYXNzKGNmZy5pbnZhbGlkQ2xzKX19fSxfZ2V0RW50cmllc0Zyb21TdHJpbmdBcnJheTpmdW5jdGlvbihkYXRhKXt2YXIganNvbj1bXTskLmVhY2goZGF0YSxmdW5jdGlvbihpbmRleCxzKXt2YXIgZW50cnk9e307ZW50cnlbY2ZnLmRpc3BsYXlGaWVsZF09ZW50cnlbY2ZnLnZhbHVlRmllbGRdPSQudHJpbShzKTtqc29uLnB1c2goZW50cnkpfSk7cmV0dXJuIGpzb259LF9oaWdobGlnaHRTdWdnZXN0aW9uOmZ1bmN0aW9uKGh0bWwpe3ZhciBxPW1zLmlucHV0LnZhbCgpO3ZhciBzcGVjaWFsQ2hhcmFjdGVycz1bXCJeXCIsXCIkXCIsXCIqXCIsXCIrXCIsXCI/XCIsXCIuXCIsXCIoXCIsXCIpXCIsXCI6XCIsXCIhXCIsXCJ8XCIsXCJ7XCIsXCJ9XCIsXCJbXCIsXCJdXCJdOyQuZWFjaChzcGVjaWFsQ2hhcmFjdGVycyxmdW5jdGlvbihpbmRleCx2YWx1ZSl7cT1xLnJlcGxhY2UodmFsdWUsXCJcXFxcXCIrdmFsdWUpfSk7aWYocS5sZW5ndGg9PT0wKXtyZXR1cm4gaHRtbH12YXIgZ2xvYj1jZmcubWF0Y2hDYXNlPT09dHJ1ZT9cImdcIjpcImdpXCI7cmV0dXJuIGh0bWwucmVwbGFjZShuZXcgUmVnRXhwKFwiKFwiK3ErXCIpKD8hKFtePF0rKT8+KVwiLGdsb2IpLFwiPGVtPiQxPC9lbT5cIil9LF9tb3ZlU2VsZWN0ZWRSb3c6ZnVuY3Rpb24oZGlyKXtpZighY2ZnLmV4cGFuZGVkKXttcy5leHBhbmQoKX12YXIgbGlzdCxzdGFydCxhY3RpdmUsc2Nyb2xsUG9zO2xpc3Q9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKVwiKTtpZihkaXI9PT1cImRvd25cIil7c3RhcnQ9bGlzdC5lcSgwKX1lbHNle3N0YXJ0PWxpc3QuZmlsdGVyKFwiOmxhc3RcIil9YWN0aXZlPW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpO2lmKGFjdGl2ZS5sZW5ndGg+MCl7aWYoZGlyPT09XCJkb3duXCIpe3N0YXJ0PWFjdGl2ZS5uZXh0QWxsKFwiLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpXCIpLmZpcnN0KCk7aWYoc3RhcnQubGVuZ3RoPT09MCl7c3RhcnQ9bGlzdC5lcSgwKX1zY3JvbGxQb3M9bXMuY29tYm9ib3guc2Nyb2xsVG9wKCk7bXMuY29tYm9ib3guc2Nyb2xsVG9wKDApO2lmKHN0YXJ0WzBdLm9mZnNldFRvcCtzdGFydC5vdXRlckhlaWdodCgpPm1zLmNvbWJvYm94LmhlaWdodCgpKXttcy5jb21ib2JveC5zY3JvbGxUb3Aoc2Nyb2xsUG9zK19jb21ib0l0ZW1IZWlnaHQpfX1lbHNle3N0YXJ0PWFjdGl2ZS5wcmV2QWxsKFwiLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpXCIpLmZpcnN0KCk7aWYoc3RhcnQubGVuZ3RoPT09MCl7c3RhcnQ9bGlzdC5maWx0ZXIoXCI6bGFzdFwiKTttcy5jb21ib2JveC5zY3JvbGxUb3AoX2NvbWJvSXRlbUhlaWdodCpsaXN0Lmxlbmd0aCl9aWYoc3RhcnRbMF0ub2Zmc2V0VG9wPG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpKXttcy5jb21ib2JveC5zY3JvbGxUb3AobXMuY29tYm9ib3guc2Nyb2xsVG9wKCktX2NvbWJvSXRlbUhlaWdodCl9fX1saXN0LnJlbW92ZUNsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpO3N0YXJ0LmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpfSxfcHJvY2Vzc1N1Z2dlc3Rpb25zOmZ1bmN0aW9uKHNvdXJjZSl7dmFyIGpzb249bnVsbCxkYXRhPXNvdXJjZXx8Y2ZnLmRhdGE7aWYoZGF0YSE9PW51bGwpe2lmKHR5cGVvZiBkYXRhPT09XCJmdW5jdGlvblwiKXtkYXRhPWRhdGEuY2FsbChtcyxtcy5nZXRSYXdWYWx1ZSgpKX1pZih0eXBlb2YgZGF0YT09PVwic3RyaW5nXCIpeyQobXMpLnRyaWdnZXIoXCJiZWZvcmVsb2FkXCIsW21zXSk7dmFyIHF1ZXJ5UGFyYW1zPXt9O3F1ZXJ5UGFyYW1zW2NmZy5xdWVyeVBhcmFtXT1tcy5pbnB1dC52YWwoKTt2YXIgcGFyYW1zPSQuZXh0ZW5kKHF1ZXJ5UGFyYW1zLGNmZy5kYXRhVXJsUGFyYW1zKTskLmFqYXgoJC5leHRlbmQoe3R5cGU6Y2ZnLm1ldGhvZCx1cmw6ZGF0YSxkYXRhOnBhcmFtcyxiZWZvcmVTZW5kOmNmZy5iZWZvcmVTZW5kLHN1Y2Nlc3M6ZnVuY3Rpb24oYXN5bmNEYXRhKXtqc29uPXR5cGVvZiBhc3luY0RhdGE9PT1cInN0cmluZ1wiP0pTT04ucGFyc2UoYXN5bmNEYXRhKTphc3luY0RhdGE7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKGpzb24pOyQobXMpLnRyaWdnZXIoXCJsb2FkXCIsW21zLGpzb25dKTtpZihzZWxmLl9hc3luY1ZhbHVlcyl7bXMuc2V0VmFsdWUodHlwZW9mIHNlbGYuX2FzeW5jVmFsdWVzPT09XCJzdHJpbmdcIj9KU09OLnBhcnNlKHNlbGYuX2FzeW5jVmFsdWVzKTpzZWxmLl9hc3luY1ZhbHVlcyk7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7ZGVsZXRlIHNlbGYuX2FzeW5jVmFsdWVzfX0sZXJyb3I6ZnVuY3Rpb24oKXt0aHJvd1wiQ291bGQgbm90IHJlYWNoIHNlcnZlclwifX0sY2ZnLmFqYXhDb25maWcpKTtyZXR1cm59ZWxzZXtpZihkYXRhLmxlbmd0aD4wJiZ0eXBlb2YgZGF0YVswXT09PVwic3RyaW5nXCIpe19jYkRhdGE9c2VsZi5fZ2V0RW50cmllc0Zyb21TdHJpbmdBcnJheShkYXRhKX1lbHNle19jYkRhdGE9ZGF0YVtjZmcucmVzdWx0c0ZpZWxkXXx8ZGF0YX19dmFyIHNvcnRlZERhdGE9Y2ZnLm1vZGU9PT1cInJlbW90ZVwiP19jYkRhdGE6c2VsZi5fc29ydEFuZFRyaW0oX2NiRGF0YSk7c2VsZi5fZGlzcGxheVN1Z2dlc3Rpb25zKHNlbGYuX2dyb3VwKHNvcnRlZERhdGEpKX19LF9yZW5kZXI6ZnVuY3Rpb24oZWwpe21zLnNldE5hbWUoY2ZnLm5hbWUpO21zLmNvbnRhaW5lcj0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLWN0biBmb3JtLWNvbnRyb2wgXCIrKGNmZy5yZXN1bHRBc1N0cmluZz9cIm1zLWFzLXN0cmluZyBcIjpcIlwiKStjZmcuY2xzKygkKGVsKS5oYXNDbGFzcyhcImlucHV0LWxnXCIpP1wiIGlucHV0LWxnXCI6XCJcIikrKCQoZWwpLmhhc0NsYXNzKFwiaW5wdXQtc21cIik/XCIgaW5wdXQtc21cIjpcIlwiKSsoY2ZnLmRpc2FibGVkPT09dHJ1ZT9cIiBtcy1jdG4tZGlzYWJsZWRcIjpcIlwiKSsoY2ZnLmVkaXRhYmxlPT09dHJ1ZT9cIlwiOlwiIG1zLWN0bi1yZWFkb25seVwiKSsoY2ZnLmhpZGVUcmlnZ2VyPT09ZmFsc2U/XCJcIjpcIiBtcy1uby10cmlnZ2VyXCIpLHN0eWxlOmNmZy5zdHlsZSxpZDpjZmcuaWR9KTttcy5jb250YWluZXIuZm9jdXMoJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cyx0aGlzKSk7bXMuY29udGFpbmVyLmJsdXIoJC5wcm94eShoYW5kbGVycy5fb25CbHVyLHRoaXMpKTttcy5jb250YWluZXIua2V5ZG93bigkLnByb3h5KGhhbmRsZXJzLl9vbktleURvd24sdGhpcykpO21zLmNvbnRhaW5lci5rZXl1cCgkLnByb3h5KGhhbmRsZXJzLl9vbktleVVwLHRoaXMpKTttcy5pbnB1dD0kKFwiPGlucHV0Lz5cIiwkLmV4dGVuZCh7dHlwZTpcInRleHRcIixcImNsYXNzXCI6Y2ZnLmVkaXRhYmxlPT09dHJ1ZT9cIlwiOlwiIG1zLWlucHV0LXJlYWRvbmx5XCIscmVhZG9ubHk6IWNmZy5lZGl0YWJsZSxwbGFjZWhvbGRlcjpjZmcucGxhY2Vob2xkZXIsZGlzYWJsZWQ6Y2ZnLmRpc2FibGVkfSxjZmcuaW5wdXRDZmcpKTttcy5pbnB1dC5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbklucHV0Rm9jdXMsdGhpcykpO21zLmlucHV0LmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRDbGljayx0aGlzKSk7bXMuY29tYm9ib3g9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1yZXMtY3RuIGRyb3Bkb3duLW1lbnVcIn0pLmhlaWdodChjZmcubWF4RHJvcEhlaWdodCk7bXMuY29tYm9ib3gub24oXCJjbGlja1wiLFwiZGl2Lm1zLXJlcy1pdGVtXCIsJC5wcm94eShoYW5kbGVycy5fb25Db21ib0l0ZW1TZWxlY3RlZCx0aGlzKSk7bXMuY29tYm9ib3gub24oXCJtb3VzZW92ZXJcIixcImRpdi5tcy1yZXMtaXRlbVwiLCQucHJveHkoaGFuZGxlcnMuX29uQ29tYm9JdGVtTW91c2VPdmVyLHRoaXMpKTtpZihjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXttcy5zZWxlY3Rpb25Db250YWluZXI9Y2ZnLnNlbGVjdGlvbkNvbnRhaW5lcjskKG1zLnNlbGVjdGlvbkNvbnRhaW5lcikuYWRkQ2xhc3MoXCJtcy1zZWwtY3RuXCIpfWVsc2V7bXMuc2VsZWN0aW9uQ29udGFpbmVyPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtc2VsLWN0blwifSl9bXMuc2VsZWN0aW9uQ29udGFpbmVyLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uRm9jdXMsdGhpcykpO2lmKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe21zLnNlbGVjdGlvbkNvbnRhaW5lci5hcHBlbmQobXMuaW5wdXQpfWVsc2V7bXMuY29udGFpbmVyLmFwcGVuZChtcy5pbnB1dCl9bXMuaGVscGVyPSQoXCI8c3Bhbi8+XCIse1wiY2xhc3NcIjpcIm1zLWhlbHBlciBcIitjZmcuaW5mb01zZ0Nsc30pO3NlbGYuX3VwZGF0ZUhlbHBlcigpO21zLmNvbnRhaW5lci5hcHBlbmQobXMuaGVscGVyKTskKGVsKS5yZXBsYWNlV2l0aChtcy5jb250YWluZXIpO2lmKCFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXtzd2l0Y2goY2ZnLnNlbGVjdGlvblBvc2l0aW9uKXtjYXNlXCJib3R0b21cIjptcy5zZWxlY3Rpb25Db250YWluZXIuaW5zZXJ0QWZ0ZXIobXMuY29udGFpbmVyKTtpZihjZmcuc2VsZWN0aW9uU3RhY2tlZD09PXRydWUpe21zLnNlbGVjdGlvbkNvbnRhaW5lci53aWR0aChtcy5jb250YWluZXIud2lkdGgoKSk7bXMuc2VsZWN0aW9uQ29udGFpbmVyLmFkZENsYXNzKFwibXMtc3RhY2tlZFwiKX1icmVhaztjYXNlXCJyaWdodFwiOm1zLnNlbGVjdGlvbkNvbnRhaW5lci5pbnNlcnRBZnRlcihtcy5jb250YWluZXIpO21zLmNvbnRhaW5lci5jc3MoXCJmbG9hdFwiLFwibGVmdFwiKTticmVhaztkZWZhdWx0Om1zLmNvbnRhaW5lci5hcHBlbmQobXMuc2VsZWN0aW9uQ29udGFpbmVyKTticmVha319aWYoY2ZnLmhpZGVUcmlnZ2VyPT09ZmFsc2Upe21zLnRyaWdnZXI9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy10cmlnZ2VyXCIsaHRtbDonPGRpdiBjbGFzcz1cIm1zLXRyaWdnZXItaWNvXCI+PC9kaXY+J30pO21zLnRyaWdnZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25UcmlnZ2VyQ2xpY2ssdGhpcykpO21zLmNvbnRhaW5lci5hcHBlbmQobXMudHJpZ2dlcil9JCh3aW5kb3cpLnJlc2l6ZSgkLnByb3h5KGhhbmRsZXJzLl9vbldpbmRvd1Jlc2l6ZWQsdGhpcykpO2lmKGNmZy52YWx1ZSE9PW51bGx8fGNmZy5kYXRhIT09bnVsbCl7aWYodHlwZW9mIGNmZy5kYXRhPT09XCJzdHJpbmdcIil7c2VsZi5fYXN5bmNWYWx1ZXM9Y2ZnLnZhbHVlO3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfWVsc2V7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7aWYoY2ZnLnZhbHVlIT09bnVsbCl7bXMuc2V0VmFsdWUoY2ZnLnZhbHVlKTtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKX19fSQoXCJib2R5XCIpLmNsaWNrKGZ1bmN0aW9uKGUpe2lmKG1zLmNvbnRhaW5lci5oYXNDbGFzcyhcIm1zLWN0bi1mb2N1c1wiKSYmbXMuY29udGFpbmVyLmhhcyhlLnRhcmdldCkubGVuZ3RoPT09MCYmZS50YXJnZXQuY2xhc3NOYW1lLmluZGV4T2YoXCJtcy1yZXMtaXRlbVwiKTwwJiZlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZihcIm1zLWNsb3NlLWJ0blwiKTwwJiZtcy5jb250YWluZXJbMF0hPT1lLnRhcmdldCl7aGFuZGxlcnMuX29uQmx1cigpfX0pO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe2NmZy5leHBhbmRlZD1mYWxzZTttcy5leHBhbmQoKX19LF9yZW5kZXJDb21ib0l0ZW1zOmZ1bmN0aW9uKGl0ZW1zLGlzR3JvdXBlZCl7dmFyIHJlZj10aGlzLGh0bWw9XCJcIjskLmVhY2goaXRlbXMsZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBkaXNwbGF5ZWQ9Y2ZnLnJlbmRlcmVyIT09bnVsbD9jZmcucmVuZGVyZXIuY2FsbChyZWYsdmFsdWUpOnZhbHVlW2NmZy5kaXNwbGF5RmllbGRdO3ZhciBkaXNhYmxlZD1jZmcuZGlzYWJsZWRGaWVsZCE9PW51bGwmJnZhbHVlW2NmZy5kaXNhYmxlZEZpZWxkXT09PXRydWU7dmFyIHJlc3VsdEl0ZW1FbD0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXJlcy1pdGVtIFwiKyhpc0dyb3VwZWQ/XCJtcy1yZXMtaXRlbS1ncm91cGVkIFwiOlwiXCIpKyhkaXNhYmxlZD9cIm1zLXJlcy1pdGVtLWRpc2FibGVkIFwiOlwiXCIpKyhpbmRleCUyPT09MSYmY2ZnLnVzZVplYnJhU3R5bGU9PT10cnVlP1wibXMtcmVzLW9kZFwiOlwiXCIpLGh0bWw6Y2ZnLmhpZ2hsaWdodD09PXRydWU/c2VsZi5faGlnaGxpZ2h0U3VnZ2VzdGlvbihkaXNwbGF5ZWQpOmRpc3BsYXllZCxcImRhdGEtanNvblwiOkpTT04uc3RyaW5naWZ5KHZhbHVlKX0pO2h0bWwrPSQoXCI8ZGl2Lz5cIikuYXBwZW5kKHJlc3VsdEl0ZW1FbCkuaHRtbCgpfSk7bXMuY29tYm9ib3guYXBwZW5kKGh0bWwpO19jb21ib0l0ZW1IZWlnaHQ9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbTpmaXJzdFwiKS5vdXRlckhlaWdodCgpfSxfcmVuZGVyU2VsZWN0aW9uOmZ1bmN0aW9uKCl7dmFyIHJlZj10aGlzLHc9MCxpbnB1dE9mZnNldD0wLGl0ZW1zPVtdLGFzVGV4dD1jZmcucmVzdWx0QXNTdHJpbmc9PT10cnVlJiYhX2hhc0ZvY3VzO21zLnNlbGVjdGlvbkNvbnRhaW5lci5maW5kKFwiLm1zLXNlbC1pdGVtXCIpLnJlbW92ZSgpO2lmKG1zLl92YWx1ZUNvbnRhaW5lciE9PXVuZGVmaW5lZCl7bXMuX3ZhbHVlQ29udGFpbmVyLnJlbW92ZSgpfSQuZWFjaChfc2VsZWN0aW9uLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXt2YXIgc2VsZWN0ZWRJdGVtRWwsZGVsSXRlbUVsLHNlbGVjdGVkSXRlbUh0bWw9Y2ZnLnNlbGVjdGlvblJlbmRlcmVyIT09bnVsbD9jZmcuc2VsZWN0aW9uUmVuZGVyZXIuY2FsbChyZWYsdmFsdWUpOnZhbHVlW2NmZy5kaXNwbGF5RmllbGRdO3ZhciB2YWxpZENscz1zZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0odmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF0pP1wiXCI6XCIgbXMtc2VsLWludmFsaWRcIjtpZihhc1RleHQ9PT10cnVlKXtzZWxlY3RlZEl0ZW1FbD0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXNlbC1pdGVtIG1zLXNlbC10ZXh0IFwiK2NmZy5zZWxlY3Rpb25DbHMrdmFsaWRDbHMsaHRtbDpzZWxlY3RlZEl0ZW1IdG1sKyhpbmRleD09PV9zZWxlY3Rpb24ubGVuZ3RoLTE/XCJcIjpjZmcucmVzdWx0QXNTdHJpbmdEZWxpbWl0ZXIpfSkuZGF0YShcImpzb25cIix2YWx1ZSl9ZWxzZXtzZWxlY3RlZEl0ZW1FbD0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXNlbC1pdGVtIFwiK2NmZy5zZWxlY3Rpb25DbHMrdmFsaWRDbHMsaHRtbDpzZWxlY3RlZEl0ZW1IdG1sfSkuZGF0YShcImpzb25cIix2YWx1ZSk7aWYoY2ZnLmRpc2FibGVkPT09ZmFsc2Upe2RlbEl0ZW1FbD0kKFwiPHNwYW4vPlwiLHtcImNsYXNzXCI6XCJtcy1jbG9zZS1idG5cIn0pLmRhdGEoXCJqc29uXCIsdmFsdWUpLmFwcGVuZFRvKHNlbGVjdGVkSXRlbUVsKTtkZWxJdGVtRWwuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25UYWdUcmlnZ2VyQ2xpY2sscmVmKSl9fWl0ZW1zLnB1c2goc2VsZWN0ZWRJdGVtRWwpfSk7bXMuc2VsZWN0aW9uQ29udGFpbmVyLnByZXBlbmQoaXRlbXMpO21zLl92YWx1ZUNvbnRhaW5lcj0kKFwiPGRpdi8+XCIse3N0eWxlOlwiZGlzcGxheTogbm9uZTtcIn0pOyQuZWFjaChtcy5nZXRWYWx1ZSgpLGZ1bmN0aW9uKGksdmFsKXt2YXIgZWw9JChcIjxpbnB1dC8+XCIse3R5cGU6XCJoaWRkZW5cIixuYW1lOmNmZy5uYW1lLHZhbHVlOnZhbH0pO2VsLmFwcGVuZFRvKG1zLl92YWx1ZUNvbnRhaW5lcil9KTttcy5fdmFsdWVDb250YWluZXIuYXBwZW5kVG8obXMuc2VsZWN0aW9uQ29udGFpbmVyKTtpZihjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJiFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXttcy5pbnB1dC53aWR0aCgwKTtpbnB1dE9mZnNldD1tcy5pbnB1dC5vZmZzZXQoKS5sZWZ0LW1zLnNlbGVjdGlvbkNvbnRhaW5lci5vZmZzZXQoKS5sZWZ0O3c9bXMuY29udGFpbmVyLndpZHRoKCktaW5wdXRPZmZzZXQtNDI7bXMuaW5wdXQud2lkdGgodyl9aWYoX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcyxfc2VsZWN0aW9uLmxlbmd0aCkpfWVsc2V7bXMuaGVscGVyLmhpZGUoKX19LF9zZWxlY3RJdGVtOmZ1bmN0aW9uKGl0ZW0pe2lmKGNmZy5tYXhTZWxlY3Rpb249PT0xKXtfc2VsZWN0aW9uPVtdfW1zLmFkZFRvU2VsZWN0aW9uKGl0ZW0uZGF0YShcImpzb25cIikpO2l0ZW0ucmVtb3ZlQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7aWYoY2ZnLmV4cGFuZE9uRm9jdXM9PT1mYWxzZXx8X3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXttcy5jb2xsYXBzZSgpfWlmKCFfaGFzRm9jdXMpe21zLmlucHV0LmZvY3VzKCl9ZWxzZSBpZihfaGFzRm9jdXMmJihjZmcuZXhwYW5kT25Gb2N1c3x8X2N0cmxEb3duKSl7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7aWYoX2N0cmxEb3duKXttcy5leHBhbmQoKX19fSxfc29ydEFuZFRyaW06ZnVuY3Rpb24oZGF0YSl7dmFyIHE9bXMuZ2V0UmF3VmFsdWUoKSxmaWx0ZXJlZD1bXSxuZXdTdWdnZXN0aW9ucz1bXSxzZWxlY3RlZFZhbHVlcz1tcy5nZXRWYWx1ZSgpO2lmKHEubGVuZ3RoPjApeyQuZWFjaChkYXRhLGZ1bmN0aW9uKGluZGV4LG9iail7dmFyIG5hbWU9b2JqW2NmZy5kaXNwbGF5RmllbGRdO2lmKGNmZy5tYXRjaENhc2U9PT10cnVlJiZuYW1lLmluZGV4T2YocSk+LTF8fGNmZy5tYXRjaENhc2U9PT1mYWxzZSYmbmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocS50b0xvd2VyQ2FzZSgpKT4tMSl7aWYoY2ZnLnN0cmljdFN1Z2dlc3Q9PT1mYWxzZXx8bmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocS50b0xvd2VyQ2FzZSgpKT09PTApe2ZpbHRlcmVkLnB1c2gob2JqKX19fSl9ZWxzZXtmaWx0ZXJlZD1kYXRhfSQuZWFjaChmaWx0ZXJlZCxmdW5jdGlvbihpbmRleCxvYmope2lmKGNmZy5hbGxvd0R1cGxpY2F0ZXN8fCQuaW5BcnJheShvYmpbY2ZnLnZhbHVlRmllbGRdLHNlbGVjdGVkVmFsdWVzKT09PS0xKXtuZXdTdWdnZXN0aW9ucy5wdXNoKG9iail9fSk7aWYoY2ZnLnNvcnRPcmRlciE9PW51bGwpe25ld1N1Z2dlc3Rpb25zLnNvcnQoZnVuY3Rpb24oYSxiKXtpZihhW2NmZy5zb3J0T3JkZXJdPGJbY2ZnLnNvcnRPcmRlcl0pe3JldHVybiBjZmcuc29ydERpcj09PVwiYXNjXCI/LTE6MX1pZihhW2NmZy5zb3J0T3JkZXJdPmJbY2ZnLnNvcnRPcmRlcl0pe3JldHVybiBjZmcuc29ydERpcj09PVwiYXNjXCI/MTotMX1yZXR1cm4gMH0pfWlmKGNmZy5tYXhTdWdnZXN0aW9ucyYmY2ZnLm1heFN1Z2dlc3Rpb25zPjApe25ld1N1Z2dlc3Rpb25zPW5ld1N1Z2dlc3Rpb25zLnNsaWNlKDAsY2ZnLm1heFN1Z2dlc3Rpb25zKX1yZXR1cm4gbmV3U3VnZ2VzdGlvbnN9LF9ncm91cDpmdW5jdGlvbihkYXRhKXtpZihjZmcuZ3JvdXBCeSE9PW51bGwpe19ncm91cHM9e307JC5lYWNoKGRhdGEsZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBwcm9wcz1jZmcuZ3JvdXBCeS5pbmRleE9mKFwiLlwiKT4tMT9jZmcuZ3JvdXBCeS5zcGxpdChcIi5cIik6Y2ZnLmdyb3VwQnk7dmFyIHByb3A9dmFsdWVbY2ZnLmdyb3VwQnldO2lmKHR5cGVvZiBwcm9wcyE9XCJzdHJpbmdcIil7cHJvcD12YWx1ZTt3aGlsZShwcm9wcy5sZW5ndGg+MCl7cHJvcD1wcm9wW3Byb3BzLnNoaWZ0KCldfX1pZihfZ3JvdXBzW3Byb3BdPT09dW5kZWZpbmVkKXtfZ3JvdXBzW3Byb3BdPXt0aXRsZTpwcm9wLGl0ZW1zOlt2YWx1ZV19fWVsc2V7X2dyb3Vwc1twcm9wXS5pdGVtcy5wdXNoKHZhbHVlKX19KX1yZXR1cm4gZGF0YX0sX3VwZGF0ZUhlbHBlcjpmdW5jdGlvbihodG1sKXttcy5oZWxwZXIuaHRtbChodG1sKTtpZighbXMuaGVscGVyLmlzKFwiOnZpc2libGVcIikpe21zLmhlbHBlci5mYWRlSW4oKX19LF92YWxpZGF0ZVNpbmdsZUl0ZW06ZnVuY3Rpb24odmFsdWUpe2lmKGNmZy52cmVnZXghPT1udWxsJiZjZmcudnJlZ2V4IGluc3RhbmNlb2YgUmVnRXhwKXtyZXR1cm4gY2ZnLnZyZWdleC50ZXN0KHZhbHVlKX1lbHNlIGlmKGNmZy52dHlwZSE9PW51bGwpe3N3aXRjaChjZmcudnR5cGUpe2Nhc2VcImFscGhhXCI6cmV0dXJuL15bYS16QS1aX10rJC8udGVzdCh2YWx1ZSk7Y2FzZVwiYWxwaGFudW1cIjpyZXR1cm4vXlthLXpBLVowLTlfXSskLy50ZXN0KHZhbHVlKTtjYXNlXCJlbWFpbFwiOnJldHVybi9eKFxcdyspKFtcXC0rLl1bXFx3XSspKkAoXFx3W1xcLVxcd10qXFwuKXsxLDV9KFtBLVphLXpdKXsyLDZ9JC8udGVzdCh2YWx1ZSk7Y2FzZVwidXJsXCI6cmV0dXJuLygoKF5odHRwcz8pfCheZnRwKSk6XFwvXFwvKFtcXC1cXHddK1xcLikrXFx3ezIsM30oXFwvWyVcXC1cXHddKyhcXC5cXHd7Mix9KT8pKigoW1xcd1xcLVxcLlxcP1xcXFxcXC8rQCYjO2B+PSUhXSopKFxcLlxcd3syLH0pPykqXFwvPykvaS50ZXN0KHZhbHVlKTtjYXNlXCJpcGFkZHJlc3NcIjpyZXR1cm4vXlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9JC8udGVzdCh2YWx1ZSl9fXJldHVybiB0cnVlfX07dmFyIGhhbmRsZXJzPXtfb25CbHVyOmZ1bmN0aW9uKCl7bXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKFwibXMtY3RuLWZvY3VzXCIpO21zLmNvbGxhcHNlKCk7X2hhc0ZvY3VzPWZhbHNlO2lmKG1zLmdldFJhd1ZhbHVlKCkhPT1cIlwiJiZjZmcuYWxsb3dGcmVlRW50cmllcz09PXRydWUpe3ZhciBvYmo9e307b2JqW2NmZy5kaXNwbGF5RmllbGRdPW9ialtjZmcudmFsdWVGaWVsZF09bXMuZ2V0UmF3VmFsdWUoKS50cmltKCk7bXMuYWRkVG9TZWxlY3Rpb24ob2JqKX1zZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtpZihtcy5pc1ZhbGlkKCk9PT1mYWxzZSl7bXMuY29udGFpbmVyLmFkZENsYXNzKGNmZy5pbnZhbGlkQ2xzKX1lbHNlIGlmKG1zLmlucHV0LnZhbCgpIT09XCJcIiYmY2ZnLmFsbG93RnJlZUVudHJpZXM9PT1mYWxzZSl7bXMuZW1wdHkoKTtzZWxmLl91cGRhdGVIZWxwZXIoXCJcIil9JChtcykudHJpZ2dlcihcImJsdXJcIixbbXNdKX0sX29uQ29tYm9JdGVtTW91c2VPdmVyOmZ1bmN0aW9uKGUpe3ZhciB0YXJnZXQ9JChlLmN1cnJlbnRUYXJnZXQpO2lmKCF0YXJnZXQuaGFzQ2xhc3MoXCJtcy1yZXMtaXRlbS1kaXNhYmxlZFwiKSl7bXMuY29tYm9ib3guY2hpbGRyZW4oKS5yZW1vdmVDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTt0YXJnZXQuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIil9fSxfb25Db21ib0l0ZW1TZWxlY3RlZDpmdW5jdGlvbihlKXt2YXIgdGFyZ2V0PSQoZS5jdXJyZW50VGFyZ2V0KTtpZighdGFyZ2V0Lmhhc0NsYXNzKFwibXMtcmVzLWl0ZW0tZGlzYWJsZWRcIikpe3NlbGYuX3NlbGVjdEl0ZW0oJChlLmN1cnJlbnRUYXJnZXQpKX19LF9vbkZvY3VzOmZ1bmN0aW9uKCl7bXMuaW5wdXQuZm9jdXMoKX0sX29uSW5wdXRDbGljazpmdW5jdGlvbigpe2lmKG1zLmlzRGlzYWJsZWQoKT09PWZhbHNlJiZfaGFzRm9jdXMpe2lmKGNmZy50b2dnbGVPbkNsaWNrPT09dHJ1ZSl7aWYoY2ZnLmV4cGFuZGVkKXttcy5jb2xsYXBzZSgpfWVsc2V7bXMuZXhwYW5kKCl9fX19LF9vbklucHV0Rm9jdXM6ZnVuY3Rpb24oKXtpZihtcy5pc0Rpc2FibGVkKCk9PT1mYWxzZSYmIV9oYXNGb2N1cyl7X2hhc0ZvY3VzPXRydWU7bXMuY29udGFpbmVyLmFkZENsYXNzKFwibXMtY3RuLWZvY3VzXCIpO21zLmNvbnRhaW5lci5yZW1vdmVDbGFzcyhjZmcuaW52YWxpZENscyk7dmFyIGN1ckxlbmd0aD1tcy5nZXRSYXdWYWx1ZSgpLmxlbmd0aDtpZihjZmcuZXhwYW5kT25Gb2N1cz09PXRydWUpe21zLmV4cGFuZCgpfWlmKF9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbil7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsX3NlbGVjdGlvbi5sZW5ndGgpKX1lbHNlIGlmKGN1ckxlbmd0aDxjZmcubWluQ2hhcnMpe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsY2ZnLm1pbkNoYXJzLWN1ckxlbmd0aCkpfXNlbGYuX3JlbmRlclNlbGVjdGlvbigpOyQobXMpLnRyaWdnZXIoXCJmb2N1c1wiLFttc10pfX0sX29uS2V5RG93bjpmdW5jdGlvbihlKXt2YXIgYWN0aXZlPW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpLGZyZWVJbnB1dD1tcy5pbnB1dC52YWwoKTskKG1zKS50cmlnZ2VyKFwia2V5ZG93blwiLFttcyxlXSk7aWYoZS5rZXlDb2RlPT09S0VZQ09ERVMuVEFCJiYoY2ZnLnVzZVRhYktleT09PWZhbHNlfHxjZmcudXNlVGFiS2V5PT09dHJ1ZSYmYWN0aXZlLmxlbmd0aD09PTAmJm1zLmlucHV0LnZhbCgpLmxlbmd0aD09PTApKXtoYW5kbGVycy5fb25CbHVyKCk7cmV0dXJufXN3aXRjaChlLmtleUNvZGUpe2Nhc2UgS0VZQ09ERVMuQkFDS1NQQUNFOmlmKGZyZWVJbnB1dC5sZW5ndGg9PT0wJiZtcy5nZXRTZWxlY3Rpb24oKS5sZW5ndGg+MCYmY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiKXtfc2VsZWN0aW9uLnBvcCgpO3NlbGYuX3JlbmRlclNlbGVjdGlvbigpOyQobXMpLnRyaWdnZXIoXCJzZWxlY3Rpb25jaGFuZ2VcIixbbXMsbXMuZ2V0U2VsZWN0aW9uKCldKTttcy5pbnB1dC5hdHRyKFwicGxhY2Vob2xkZXJcIixjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJm1zLmdldFZhbHVlKCkubGVuZ3RoPjA/XCJcIjpjZmcucGxhY2Vob2xkZXIpO21zLmlucHV0LmZvY3VzKCk7ZS5wcmV2ZW50RGVmYXVsdCgpfWJyZWFrO2Nhc2UgS0VZQ09ERVMuVEFCOmNhc2UgS0VZQ09ERVMuRVNDOmUucHJldmVudERlZmF1bHQoKTticmVhaztjYXNlIEtFWUNPREVTLkVOVEVSOmlmKGZyZWVJbnB1dCE9PVwiXCJ8fGNmZy5leHBhbmRlZCl7ZS5wcmV2ZW50RGVmYXVsdCgpfWJyZWFrO2Nhc2UgS0VZQ09ERVMuQ09NTUE6aWYoY2ZnLnVzZUNvbW1hS2V5PT09dHJ1ZSl7ZS5wcmV2ZW50RGVmYXVsdCgpfWJyZWFrO2Nhc2UgS0VZQ09ERVMuQ1RSTDpfY3RybERvd249dHJ1ZTticmVhaztjYXNlIEtFWUNPREVTLkRPV05BUlJPVzplLnByZXZlbnREZWZhdWx0KCk7c2VsZi5fbW92ZVNlbGVjdGVkUm93KFwiZG93blwiKTticmVhaztjYXNlIEtFWUNPREVTLlVQQVJST1c6ZS5wcmV2ZW50RGVmYXVsdCgpO3NlbGYuX21vdmVTZWxlY3RlZFJvdyhcInVwXCIpO2JyZWFrO2RlZmF1bHQ6aWYoX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWt9fSxfb25LZXlVcDpmdW5jdGlvbihlKXt2YXIgZnJlZUlucHV0PW1zLmdldFJhd1ZhbHVlKCksaW5wdXRWYWxpZD0kLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aD4wJiYoIWNmZy5tYXhFbnRyeUxlbmd0aHx8JC50cmltKG1zLmlucHV0LnZhbCgpKS5sZW5ndGg8PWNmZy5tYXhFbnRyeUxlbmd0aCksc2VsZWN0ZWQsb2JqPXt9OyQobXMpLnRyaWdnZXIoXCJrZXl1cFwiLFttcyxlXSk7Y2xlYXJUaW1lb3V0KF90aW1lcik7aWYoZS5rZXlDb2RlPT09S0VZQ09ERVMuRVNDJiZjZmcuZXhwYW5kZWQpe21zLmNvbWJvYm94LmhpZGUoKX1pZihlLmtleUNvZGU9PT1LRVlDT0RFUy5UQUImJmNmZy51c2VUYWJLZXk9PT1mYWxzZXx8ZS5rZXlDb2RlPktFWUNPREVTLkVOVEVSJiZlLmtleUNvZGU8S0VZQ09ERVMuU1BBQ0Upe2lmKGUua2V5Q29kZT09PUtFWUNPREVTLkNUUkwpe19jdHJsRG93bj1mYWxzZX1yZXR1cm59c3dpdGNoKGUua2V5Q29kZSl7Y2FzZSBLRVlDT0RFUy5VUEFSUk9XOmNhc2UgS0VZQ09ERVMuRE9XTkFSUk9XOmUucHJldmVudERlZmF1bHQoKTticmVhaztjYXNlIEtFWUNPREVTLkVOVEVSOmNhc2UgS0VZQ09ERVMuVEFCOmNhc2UgS0VZQ09ERVMuQ09NTUE6aWYoZS5rZXlDb2RlIT09S0VZQ09ERVMuQ09NTUF8fGNmZy51c2VDb21tYUtleT09PXRydWUpe2UucHJldmVudERlZmF1bHQoKTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXtzZWxlY3RlZD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdFwiKTtpZihzZWxlY3RlZC5sZW5ndGg+MCl7c2VsZi5fc2VsZWN0SXRlbShzZWxlY3RlZCk7cmV0dXJufX1pZihpbnB1dFZhbGlkPT09dHJ1ZSYmY2ZnLmFsbG93RnJlZUVudHJpZXM9PT10cnVlKXtvYmpbY2ZnLmRpc3BsYXlGaWVsZF09b2JqW2NmZy52YWx1ZUZpZWxkXT1mcmVlSW5wdXQudHJpbSgpO21zLmFkZFRvU2VsZWN0aW9uKG9iaik7bXMuY29sbGFwc2UoKTttcy5pbnB1dC5mb2N1cygpfWJyZWFrfWRlZmF1bHQ6aWYoX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcyxfc2VsZWN0aW9uLmxlbmd0aCkpfWVsc2V7aWYoZnJlZUlucHV0Lmxlbmd0aDxjZmcubWluQ2hhcnMpe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsY2ZnLm1pbkNoYXJzLWZyZWVJbnB1dC5sZW5ndGgpKTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXttcy5jb2xsYXBzZSgpfX1lbHNlIGlmKGNmZy5tYXhFbnRyeUxlbmd0aCYmZnJlZUlucHV0Lmxlbmd0aD5jZmcubWF4RW50cnlMZW5ndGgpe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4RW50cnlSZW5kZXJlci5jYWxsKHRoaXMsZnJlZUlucHV0Lmxlbmd0aC1jZmcubWF4RW50cnlMZW5ndGgpKTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXttcy5jb2xsYXBzZSgpfX1lbHNle21zLmhlbHBlci5oaWRlKCk7aWYoY2ZnLm1pbkNoYXJzPD1mcmVlSW5wdXQubGVuZ3RoKXtfdGltZXI9c2V0VGltZW91dChmdW5jdGlvbigpe2lmKGNmZy5leHBhbmRlZD09PXRydWUpe3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfWVsc2V7bXMuZXhwYW5kKCl9fSxjZmcudHlwZURlbGF5KX19fWJyZWFrfX0sX29uVGFnVHJpZ2dlckNsaWNrOmZ1bmN0aW9uKGUpe21zLnJlbW92ZUZyb21TZWxlY3Rpb24oJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoXCJqc29uXCIpKX0sX29uVHJpZ2dlckNsaWNrOmZ1bmN0aW9uKCl7aWYobXMuaXNEaXNhYmxlZCgpPT09ZmFsc2UmJiEoY2ZnLmV4cGFuZE9uRm9jdXM9PT10cnVlJiZfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pKXskKG1zKS50cmlnZ2VyKFwidHJpZ2dlcmNsaWNrXCIsW21zXSk7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7bXMuY29sbGFwc2UoKX1lbHNle3ZhciBjdXJMZW5ndGg9bXMuZ2V0UmF3VmFsdWUoKS5sZW5ndGg7aWYoY3VyTGVuZ3RoPj1jZmcubWluQ2hhcnMpe21zLmlucHV0LmZvY3VzKCk7bXMuZXhwYW5kKCl9ZWxzZXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLGNmZy5taW5DaGFycy1jdXJMZW5ndGgpKX19fX0sX29uV2luZG93UmVzaXplZDpmdW5jdGlvbigpe3NlbGYuX3JlbmRlclNlbGVjdGlvbigpfX07aWYoZWxlbWVudCE9PW51bGwpe3NlbGYuX3JlbmRlcihlbGVtZW50KX19OyQuZm4ubWFnaWNTdWdnZXN0PWZ1bmN0aW9uKG9wdGlvbnMpe3ZhciBvYmo9JCh0aGlzKTtpZihvYmouc2l6ZSgpPT09MSYmb2JqLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIikpe3JldHVybiBvYmouZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKX1vYmouZWFjaChmdW5jdGlvbihpKXt2YXIgY250cj0kKHRoaXMpO2lmKGNudHIuZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKSl7cmV0dXJufWlmKHRoaXMubm9kZU5hbWUudG9Mb3dlckNhc2UoKT09PVwic2VsZWN0XCIpe29wdGlvbnMuZGF0YT1bXTtvcHRpb25zLnZhbHVlPVtdOyQuZWFjaCh0aGlzLmNoaWxkcmVuLGZ1bmN0aW9uKGluZGV4LGNoaWxkKXtpZihjaGlsZC5ub2RlTmFtZSYmY2hpbGQubm9kZU5hbWUudG9Mb3dlckNhc2UoKT09PVwib3B0aW9uXCIpe29wdGlvbnMuZGF0YS5wdXNoKHtpZDpjaGlsZC52YWx1ZSxuYW1lOmNoaWxkLnRleHR9KTtpZigkKGNoaWxkKS5hdHRyKFwic2VsZWN0ZWRcIikpe29wdGlvbnMudmFsdWUucHVzaChjaGlsZC52YWx1ZSl9fX0pfXZhciBkZWY9e307JC5lYWNoKHRoaXMuYXR0cmlidXRlcyxmdW5jdGlvbihpLGF0dCl7ZGVmW2F0dC5uYW1lXT1hdHQubmFtZT09PVwidmFsdWVcIiYmYXR0LnZhbHVlIT09XCJcIj9KU09OLnBhcnNlKGF0dC52YWx1ZSk6YXR0LnZhbHVlfSk7dmFyIGZpZWxkPW5ldyBNYWdpY1N1Z2dlc3QodGhpcywkLmV4dGVuZChbXSwkLmZuLm1hZ2ljU3VnZ2VzdC5kZWZhdWx0cyxvcHRpb25zLGRlZikpO2NudHIuZGF0YShcIm1hZ2ljU3VnZ2VzdFwiLGZpZWxkKTtmaWVsZC5jb250YWluZXIuZGF0YShcIm1hZ2ljU3VnZ2VzdFwiLGZpZWxkKX0pO2lmKG9iai5zaXplKCk9PT0xKXtyZXR1cm4gb2JqLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIil9cmV0dXJuIG9ian07JC5mbi5tYWdpY1N1Z2dlc3QuZGVmYXVsdHM9e319KShqUXVlcnkpOyIsIi8qKlxuICogTXVsdGlwbGUgU2VsZWN0aW9uIENvbXBvbmVudCBmb3IgQm9vdHN0cmFwXG4gKiBDaGVjayBuaWNvbGFzYml6ZS5naXRodWIuaW8vbWFnaWNzdWdnZXN0LyBmb3IgbGF0ZXN0IHVwZGF0ZXMuXG4gKlxuICogQXV0aG9yOiAgICAgICBOaWNvbGFzIEJpemVcbiAqIENyZWF0ZWQ6ICAgICAgRmViIDh0aCAyMDEzXG4gKiBMYXN0IFVwZGF0ZWQ6IE9jdCAxNnRoIDIwMTRcbiAqIFZlcnNpb246ICAgICAgMi4xLjRcbiAqIExpY2VuY2U6ICAgICAgTWFnaWNTdWdnZXN0IGlzIGxpY2VuY2VkIHVuZGVyIE1JVCBsaWNlbmNlIChodHRwOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUKVxuICovXG4oZnVuY3Rpb24oJClcbntcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgTWFnaWNTdWdnZXN0ID0gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucylcbiAgICB7XG4gICAgICAgIHZhciBtcyA9IHRoaXM7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluaXRpYWxpemVzIHRoZSBNYWdpY1N1Z2dlc3QgY29tcG9uZW50XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICAvKioqKioqKioqKiAgQ09ORklHVVJBVElPTiBQUk9QRVJUSUVTICoqKioqKioqKioqKi9cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVzdHJpY3RzIG9yIGFsbG93cyB0aGUgdXNlciB0byB2YWxpZGF0ZSB0eXBlZCBlbnRyaWVzLlxuICAgICAgICAgICAgICogRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWxsb3dGcmVlRW50cmllczogdHJ1ZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXN0cmljdHMgb3IgYWxsb3dzIHRoZSB1c2VyIHRvIGFkZCB0aGUgc2FtZSBlbnRyeSBtb3JlIHRoYW4gb25jZVxuICAgICAgICAgICAgICogRGVmYXVsdHMgdG8gZmFsc2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFsbG93RHVwbGljYXRlczogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWRkaXRpb25hbCBjb25maWcgb2JqZWN0IHBhc3NlZCB0byBlYWNoICQuYWpheCBjYWxsXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFqYXhDb25maWc6IHt9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIElmIGEgc2luZ2xlIHN1Z2dlc3Rpb24gY29tZXMgb3V0LCBpdCBpcyBwcmVzZWxlY3RlZC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYXV0b1NlbGVjdDogdHJ1ZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBdXRvIHNlbGVjdCB0aGUgZmlyc3QgbWF0Y2hpbmcgaXRlbSB3aXRoIG11bHRpcGxlIGl0ZW1zIHNob3duXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdEZpcnN0OiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBbGxvdyBjdXN0b21pemF0aW9uIG9mIHF1ZXJ5IHBhcmFtZXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBxdWVyeVBhcmFtOiAncXVlcnknLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdHJpZ2dlcmVkIGp1c3QgYmVmb3JlIHRoZSBhamF4IHJlcXVlc3QgaXMgc2VudCwgc2ltaWxhciB0byBqUXVlcnlcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYmVmb3JlU2VuZDogZnVuY3Rpb24oKXsgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGN1c3RvbSBDU1MgY2xhc3MgdG8gYXBwbHkgdG8gdGhlIGZpZWxkJ3MgdW5kZXJseWluZyBlbGVtZW50LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjbHM6ICcnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEpTT04gRGF0YSBzb3VyY2UgdXNlZCB0byBwb3B1bGF0ZSB0aGUgY29tYm8gYm94LiAzIG9wdGlvbnMgYXJlIGF2YWlsYWJsZSBoZXJlOlxuICAgICAgICAgICAgICogTm8gRGF0YSBTb3VyY2UgKGRlZmF1bHQpXG4gICAgICAgICAgICAgKiAgICBXaGVuIGxlZnQgbnVsbCwgdGhlIGNvbWJvIGJveCB3aWxsIG5vdCBzdWdnZXN0IGFueXRoaW5nLiBJdCBjYW4gc3RpbGwgZW5hYmxlIHRoZSB1c2VyIHRvIGVudGVyXG4gICAgICAgICAgICAgKiAgICBtdWx0aXBsZSBlbnRyaWVzIGlmIGFsbG93RnJlZUVudHJpZXMgaXMgKiBzZXQgdG8gdHJ1ZSAoZGVmYXVsdCkuXG4gICAgICAgICAgICAgKiBTdGF0aWMgU291cmNlXG4gICAgICAgICAgICAgKiAgICBZb3UgY2FuIHBhc3MgYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzLCBhbiBhcnJheSBvZiBzdHJpbmdzIG9yIGV2ZW4gYSBzaW5nbGUgQ1NWIHN0cmluZyBhcyB0aGVcbiAgICAgICAgICAgICAqICAgIGRhdGEgc291cmNlLkZvciBleC4gZGF0YTogWyoge2lkOjAsbmFtZTpcIlBhcmlzXCJ9LCB7aWQ6IDEsIG5hbWU6IFwiTmV3IFlvcmtcIn1dXG4gICAgICAgICAgICAgKiAgICBZb3UgY2FuIGFsc28gcGFzcyBhbnkganNvbiBvYmplY3Qgd2l0aCB0aGUgcmVzdWx0cyBwcm9wZXJ0eSBjb250YWluaW5nIHRoZSBqc29uIGFycmF5LlxuICAgICAgICAgICAgICogVXJsXG4gICAgICAgICAgICAgKiAgICAgWW91IGNhbiBwYXNzIHRoZSB1cmwgZnJvbSB3aGljaCB0aGUgY29tcG9uZW50IHdpbGwgZmV0Y2ggaXRzIEpTT04gZGF0YS5EYXRhIHdpbGwgYmUgZmV0Y2hlZFxuICAgICAgICAgICAgICogICAgIHVzaW5nIGEgUE9TVCBhamF4IHJlcXVlc3QgdGhhdCB3aWxsICogaW5jbHVkZSB0aGUgZW50ZXJlZCB0ZXh0IGFzICdxdWVyeScgcGFyYW1ldGVyLiBUaGUgcmVzdWx0c1xuICAgICAgICAgICAgICogICAgIGZldGNoZWQgZnJvbSB0aGUgc2VydmVyIGNhbiBiZTpcbiAgICAgICAgICAgICAqICAgICAtIGFuIGFycmF5IG9mIEpTT04gb2JqZWN0cyAoZXg6IFt7aWQ6Li4uLG5hbWU6Li4ufSx7Li4ufV0pXG4gICAgICAgICAgICAgKiAgICAgLSBhIHN0cmluZyBjb250YWluaW5nIGFuIGFycmF5IG9mIEpTT04gb2JqZWN0cyByZWFkeSB0byBiZSBwYXJzZWQgKGV4OiBcIlt7aWQ6Li4uLG5hbWU6Li4ufSx7Li4ufV1cIilcbiAgICAgICAgICAgICAqICAgICAtIGEgSlNPTiBvYmplY3Qgd2hvc2UgZGF0YSB3aWxsIGJlIGNvbnRhaW5lZCBpbiB0aGUgcmVzdWx0cyBwcm9wZXJ0eVxuICAgICAgICAgICAgICogICAgICAoZXg6IHtyZXN1bHRzOiBbe2lkOi4uLixuYW1lOi4uLn0sey4uLn1dXG4gICAgICAgICAgICAgKiBGdW5jdGlvblxuICAgICAgICAgICAgICogICAgIFlvdSBjYW4gcGFzcyBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzICAoZXg6IFt7aWQ6Li4uLG5hbWU6Li4ufSx7Li4ufV0pXG4gICAgICAgICAgICAgKiAgICAgVGhlIGZ1bmN0aW9uIGNhbiByZXR1cm4gdGhlIEpTT04gZGF0YSBvciBpdCBjYW4gdXNlIHRoZSBmaXJzdCBhcmd1bWVudCBhcyBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIGRhdGEuXG4gICAgICAgICAgICAgKiAgICAgT25seSBvbmUgKGNhbGxiYWNrIGZ1bmN0aW9uIG9yIHJldHVybiB2YWx1ZSkgaXMgbmVlZGVkIGZvciB0aGUgZnVuY3Rpb24gdG8gc3VjY2VlZC5cbiAgICAgICAgICAgICAqICAgICBTZWUgdGhlIGZvbGxvd2luZyBleGFtcGxlOlxuICAgICAgICAgICAgICogICAgIGZ1bmN0aW9uIChyZXNwb25zZSkgeyB2YXIgbXlqc29uID0gW3tuYW1lOiAndGVzdCcsIGlkOiAxfV07IHJlc3BvbnNlKG15anNvbik7IHJldHVybiBteWpzb247IH1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGF0YTogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgdG8gdGhlIGFqYXggY2FsbFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkYXRhVXJsUGFyYW1zOiB7fSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTdGFydCB0aGUgY29tcG9uZW50IGluIGEgZGlzYWJsZWQgc3RhdGUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRpc2FibGVkOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBOYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IHRoYXQgZGVmaW5lcyB0aGUgZGlzYWJsZWQgYmVoYXZpb3VyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRpc2FibGVkRmllbGQ6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogTmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSBkaXNwbGF5ZWQgaW4gdGhlIGNvbWJvIGxpc3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGlzcGxheUZpZWxkOiAnbmFtZScsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRvIGZhbHNlIGlmIHlvdSBvbmx5IHdhbnQgbW91c2UgaW50ZXJhY3Rpb24uIEluIHRoYXQgY2FzZSB0aGUgY29tYm8gd2lsbFxuICAgICAgICAgICAgICogYXV0b21hdGljYWxseSBleHBhbmQgb24gZm9jdXMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGVkaXRhYmxlOiB0cnVlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCBzdGFydGluZyBzdGF0ZSBmb3IgY29tYm8uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGV4cGFuZGVkOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBdXRvbWF0aWNhbGx5IGV4cGFuZHMgY29tYm8gb24gZm9jdXMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGV4cGFuZE9uRm9jdXM6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEpTT04gcHJvcGVydHkgYnkgd2hpY2ggdGhlIGxpc3Qgc2hvdWxkIGJlIGdyb3VwZWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZ3JvdXBCeTogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byBoaWRlIHRoZSB0cmlnZ2VyIG9uIHRoZSByaWdodFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBoaWRlVHJpZ2dlcjogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gaGlnaGxpZ2h0IHNlYXJjaCBpbnB1dCB3aXRoaW4gZGlzcGxheWVkIHN1Z2dlc3Rpb25zXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGN1c3RvbSBJRCBmb3IgdGhpcyBjb21wb25lbnRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWQ6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBjbGFzcyB0aGF0IGlzIGFkZGVkIHRvIHRoZSBpbmZvIG1lc3NhZ2UgYXBwZWFyaW5nIG9uIHRoZSB0b3AtcmlnaHQgcGFydCBvZiB0aGUgY29tcG9uZW50XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGluZm9Nc2dDbHM6ICcnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkZGl0aW9uYWwgcGFyYW1ldGVycyBwYXNzZWQgb3V0IHRvIHRoZSBJTlBVVCB0YWcuIEVuYWJsZXMgdXNhZ2Ugb2YgQW5ndWxhckpTJ3MgY3VzdG9tIHRhZ3MgZm9yIGV4LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbnB1dENmZzoge30sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIGNsYXNzIHRoYXQgaXMgYXBwbGllZCB0byBzaG93IHRoYXQgdGhlIGZpZWxkIGlzIGludmFsaWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW52YWxpZENsczogJ21zLWludicsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gZmlsdGVyIGRhdGEgcmVzdWx0cyBhY2NvcmRpbmcgdG8gY2FzZS4gVXNlbGVzcyBpZiB0aGUgZGF0YSBpcyBmZXRjaGVkIHJlbW90ZWx5XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1hdGNoQ2FzZTogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogT25jZSBleHBhbmRlZCwgdGhlIGNvbWJvJ3MgaGVpZ2h0IHdpbGwgdGFrZSBhcyBtdWNoIHJvb20gYXMgdGhlICMgb2YgYXZhaWxhYmxlIHJlc3VsdHMuXG4gICAgICAgICAgICAgKiAgICBJbiBjYXNlIHRoZXJlIGFyZSB0b28gbWFueSByZXN1bHRzIGRpc3BsYXllZCwgdGhpcyB3aWxsIGZpeCB0aGUgZHJvcCBkb3duIGhlaWdodC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWF4RHJvcEhlaWdodDogMjkwLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlZmluZXMgaG93IGxvbmcgdGhlIHVzZXIgZnJlZSBlbnRyeSBjYW4gYmUuIFNldCB0byBudWxsIGZvciBubyBsaW1pdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWF4RW50cnlMZW5ndGg6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0aGF0IGRlZmluZXMgdGhlIGhlbHBlciB0ZXh0IHdoZW4gdGhlIG1heCBlbnRyeSBsZW5ndGggaGFzIGJlZW4gc3VycGFzc2VkLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXhFbnRyeVJlbmRlcmVyOiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdQbGVhc2UgcmVkdWNlIHlvdXIgZW50cnkgYnkgJyArIHYgKyAnIGNoYXJhY3RlcicgKyAodiA+IDEgPyAncyc6JycpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgcmVzdWx0cyBkaXNwbGF5ZWQgaW4gdGhlIGNvbWJvIGRyb3AgZG93biBhdCBvbmNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXhTdWdnZXN0aW9uczogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdGhlIHVzZXIgY2FuIHNlbGVjdCBpZiBtdWx0aXBsZSBzZWxlY3Rpb24gaXMgYWxsb3dlZC5cbiAgICAgICAgICAgICAqICAgIFNldCB0byBudWxsIHRvIHJlbW92ZSB0aGUgbGltaXQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heFNlbGVjdGlvbjogMTAsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0aGF0IGRlZmluZXMgdGhlIGhlbHBlciB0ZXh0IHdoZW4gdGhlIG1heCBzZWxlY3Rpb24gYW1vdW50IGhhcyBiZWVuIHJlYWNoZWQuIFRoZSBmdW5jdGlvbiBoYXMgYSBzaW5nbGVcbiAgICAgICAgICAgICAqICAgIHBhcmFtZXRlciB3aGljaCBpcyB0aGUgbnVtYmVyIG9mIHNlbGVjdGVkIGVsZW1lbnRzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXhTZWxlY3Rpb25SZW5kZXJlcjogZnVuY3Rpb24odikge1xuICAgICAgICAgICAgICAgIHJldHVybiAnWW91IGNhbm5vdCBjaG9vc2UgbW9yZSB0aGFuICcgKyB2ICsgJyBpdGVtJyArICh2ID4gMSA/ICdzJzonJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBtZXRob2QgdXNlZCBieSB0aGUgYWpheCByZXF1ZXN0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgbWluaW11bSBudW1iZXIgb2YgY2hhcmFjdGVycyB0aGUgdXNlciBtdXN0IHR5cGUgYmVmb3JlIHRoZSBjb21ibyBleHBhbmRzIGFuZCBvZmZlcnMgc3VnZ2VzdGlvbnMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1pbkNoYXJzOiAwLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIHRoZSBoZWxwZXIgdGV4dCB3aGVuIG5vdCBlbm91Z2ggbGV0dGVycyBhcmUgc2V0LiBUaGUgZnVuY3Rpb24gaGFzIGEgc2luZ2xlXG4gICAgICAgICAgICAgKiAgICBwYXJhbWV0ZXIgd2hpY2ggaXMgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiB0aGUgcmVxdWlyZWQgYW1vdW50IG9mIGxldHRlcnMgYW5kIHRoZSBjdXJyZW50IG9uZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWluQ2hhcnNSZW5kZXJlcjogZnVuY3Rpb24odikge1xuICAgICAgICAgICAgICAgIHJldHVybiAnUGxlYXNlIHR5cGUgJyArIHYgKyAnIG1vcmUgY2hhcmFjdGVyJyArICh2ID4gMSA/ICdzJzonJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFdoZXRoZXIgb3Igbm90IHNvcnRpbmcgLyBmaWx0ZXJpbmcgc2hvdWxkIGJlIGRvbmUgcmVtb3RlbHkgb3IgbG9jYWxseS5cbiAgICAgICAgICAgICAqIFVzZSBlaXRoZXIgJ2xvY2FsJyBvciAncmVtb3RlJ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtb2RlOiAnbG9jYWwnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBuYW1lIHVzZWQgYXMgYSBmb3JtIGVsZW1lbnQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG5hbWU6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIHRleHQgZGlzcGxheWVkIHdoZW4gdGhlcmUgYXJlIG5vIHN1Z2dlc3Rpb25zLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBub1N1Z2dlc3Rpb25UZXh0OiAnTm8gc3VnZ2VzdGlvbnMnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBkZWZhdWx0IHBsYWNlaG9sZGVyIHRleHQgd2hlbiBub3RoaW5nIGhhcyBiZWVuIGVudGVyZWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICdUeXBlIG9yIGNsaWNrIGhlcmUnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdXNlZCB0byBkZWZpbmUgaG93IHRoZSBpdGVtcyB3aWxsIGJlIHByZXNlbnRlZCBpbiB0aGUgY29tYm9cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVuZGVyZXI6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogV2hldGhlciBvciBub3QgdGhpcyBmaWVsZCBzaG91bGQgYmUgcmVxdWlyZWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIHJlbmRlciBzZWxlY3Rpb24gYXMgYSBkZWxpbWl0ZWQgc3RyaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlc3VsdEFzU3RyaW5nOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUZXh0IGRlbGltaXRlciB0byB1c2UgaW4gYSBkZWxpbWl0ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXN1bHRBc1N0cmluZ0RlbGltaXRlcjogJywnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgdGhhdCByZXByZXNlbnRzIHRoZSBsaXN0IG9mIHN1Z2dlc3RlZCBvYmplY3RzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlc3VsdHNGaWVsZDogJ3Jlc3VsdHMnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgY3VzdG9tIENTUyBjbGFzcyB0byBhZGQgdG8gYSBzZWxlY3RlZCBpdGVtXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdGlvbkNsczogJycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQW4gb3B0aW9uYWwgZWxlbWVudCByZXBsYWNlbWVudCBpbiB3aGljaCB0aGUgc2VsZWN0aW9uIGlzIHJlbmRlcmVkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdGlvbkNvbnRhaW5lcjogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBXaGVyZSB0aGUgc2VsZWN0ZWQgaXRlbXMgd2lsbCBiZSBkaXNwbGF5ZWQuIE9ubHkgJ3JpZ2h0JywgJ2JvdHRvbScgYW5kICdpbm5lcicgYXJlIHZhbGlkIHZhbHVlc1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZWxlY3Rpb25Qb3NpdGlvbjogJ2lubmVyJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHVzZWQgdG8gZGVmaW5lIGhvdyB0aGUgaXRlbXMgd2lsbCBiZSBwcmVzZW50ZWQgaW4gdGhlIHRhZyBsaXN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdGlvblJlbmRlcmVyOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIHN0YWNrIHRoZSBzZWxlY3Rpb25lZCBpdGVtcyB3aGVuIHBvc2l0aW9uZWQgb24gdGhlIGJvdHRvbVxuICAgICAgICAgICAgICogICAgUmVxdWlyZXMgdGhlIHNlbGVjdGlvblBvc2l0aW9uIHRvIGJlIHNldCB0byAnYm90dG9tJ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZWxlY3Rpb25TdGFja2VkOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEaXJlY3Rpb24gdXNlZCBmb3Igc29ydGluZy4gT25seSAnYXNjJyBhbmQgJ2Rlc2MnIGFyZSB2YWxpZCB2YWx1ZXNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc29ydERpcjogJ2FzYycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogbmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSBmb3IgbG9jYWwgcmVzdWx0IHNvcnRpbmcuXG4gICAgICAgICAgICAgKiAgICBMZWF2ZSBudWxsIGlmIHlvdSBkbyBub3Qgd2lzaCB0aGUgcmVzdWx0cyB0byBiZSBvcmRlcmVkIG9yIGlmIHRoZXkgYXJlIGFscmVhZHkgb3JkZXJlZCByZW1vdGVseS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc29ydE9yZGVyOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIElmIHNldCB0byB0cnVlLCBzdWdnZXN0aW9ucyB3aWxsIGhhdmUgdG8gc3RhcnQgYnkgdXNlciBpbnB1dCAoYW5kIG5vdCBzaW1wbHkgY29udGFpbiBpdCBhcyBhIHN1YnN0cmluZylcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc3RyaWN0U3VnZ2VzdDogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3VzdG9tIHN0eWxlIGFkZGVkIHRvIHRoZSBjb21wb25lbnQgY29udGFpbmVyLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzdHlsZTogJycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHRoZSBjb21ibyB3aWxsIGV4cGFuZCAvIGNvbGxhcHNlIHdoZW4gY2xpY2tlZCB1cG9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRvZ2dsZU9uQ2xpY2s6IGZhbHNlLFxuXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQW1vdW50IChpbiBtcykgYmV0d2VlbiBrZXlib2FyZCByZWdpc3RlcnMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHR5cGVEZWxheTogNDAwLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIElmIHNldCB0byB0cnVlLCB0YWIgd29uJ3QgYmx1ciB0aGUgY29tcG9uZW50IGJ1dCB3aWxsIGJlIHJlZ2lzdGVyZWQgYXMgdGhlIEVOVEVSIGtleVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB1c2VUYWJLZXk6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIElmIHNldCB0byB0cnVlLCB1c2luZyBjb21tYSB3aWxsIHZhbGlkYXRlIHRoZSB1c2VyJ3MgY2hvaWNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHVzZUNvbW1hS2V5OiB0cnVlLFxuXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIG5vdCB0aGUgcmVzdWx0cyB3aWxsIGJlIGRpc3BsYXllZCB3aXRoIGEgemVicmEgdGFibGUgc3R5bGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdXNlWmVicmFTdHlsZTogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogaW5pdGlhbCB2YWx1ZSBmb3IgdGhlIGZpZWxkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHZhbHVlOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIG5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgdGhhdCByZXByZXNlbnRzIGl0cyB1bmRlcmx5aW5nIHZhbHVlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHZhbHVlRmllbGQ6ICdpZCcsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogcmVndWxhciBleHByZXNzaW9uIHRvIHZhbGlkYXRlIHRoZSB2YWx1ZXMgYWdhaW5zdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB2cmVnZXg6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogdHlwZSB0byB2YWxpZGF0ZSBhZ2FpbnN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHZ0eXBlOiBudWxsXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGNvbmYgPSAkLmV4dGVuZCh7fSxvcHRpb25zKTtcbiAgICAgICAgdmFyIGNmZyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgY29uZik7XG5cbiAgICAgICAgLyoqKioqKioqKiogIFBVQkxJQyBNRVRIT0RTICoqKioqKioqKioqKi9cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZCBvbmUgb3IgbXVsdGlwbGUganNvbiBpdGVtcyB0byB0aGUgY3VycmVudCBzZWxlY3Rpb25cbiAgICAgICAgICogQHBhcmFtIGl0ZW1zIC0ganNvbiBvYmplY3Qgb3IgYXJyYXkgb2YganNvbiBvYmplY3RzXG4gICAgICAgICAqIEBwYXJhbSBpc1NpbGVudCAtIChvcHRpb25hbCkgc2V0IHRvIHRydWUgdG8gc3VwcHJlc3MgJ3NlbGVjdGlvbmNoYW5nZScgZXZlbnQgZnJvbSBiZWluZyB0cmlnZ2VyZWRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYWRkVG9TZWxlY3Rpb24gPSBmdW5jdGlvbihpdGVtcywgaXNTaWxlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICghY2ZnLm1heFNlbGVjdGlvbiB8fCBfc2VsZWN0aW9uLmxlbmd0aCA8IGNmZy5tYXhTZWxlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBpZiAoISQuaXNBcnJheShpdGVtcykpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbXMgPSBbaXRlbXNdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgdmFsdWVjaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJC5lYWNoKGl0ZW1zLCBmdW5jdGlvbihpbmRleCwganNvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ZnLmFsbG93RHVwbGljYXRlcyB8fCAkLmluQXJyYXkoanNvbltjZmcudmFsdWVGaWVsZF0sIG1zLmdldFZhbHVlKCkpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX3NlbGVjdGlvbi5wdXNoKGpzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmKHZhbHVlY2hhbmdlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbXB0eSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNTaWxlbnQgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykudHJpZ2dlcignc2VsZWN0aW9uY2hhbmdlJywgW3RoaXMsIHRoaXMuZ2V0U2VsZWN0aW9uKCldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaW5wdXQuYXR0cigncGxhY2Vob2xkZXInLCAoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmIHRoaXMuZ2V0VmFsdWUoKS5sZW5ndGggPiAwKSA/ICcnIDogY2ZnLnBsYWNlaG9sZGVyKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2xlYXJzIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgICAgICAgKiBAcGFyYW0gaXNTaWxlbnQgLSAob3B0aW9uYWwpIHNldCB0byB0cnVlIHRvIHN1cHByZXNzICdzZWxlY3Rpb25jaGFuZ2UnIGV2ZW50IGZyb20gYmVpbmcgdHJpZ2dlcmVkXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNsZWFyID0gZnVuY3Rpb24oaXNTaWxlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlRnJvbVNlbGVjdGlvbihfc2VsZWN0aW9uLnNsaWNlKDApLCBpc1NpbGVudCk7IC8vIGNsb25lIGFycmF5IHRvIGF2b2lkIGNvbmN1cnJlbmN5IGlzc3Vlc1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb2xsYXBzZSB0aGUgZHJvcCBkb3duIHBhcnQgb2YgdGhlIGNvbWJvXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNvbGxhcHNlID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21ib2JveC5kZXRhY2goKTtcbiAgICAgICAgICAgICAgICBjZmcuZXhwYW5kZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ2NvbGxhcHNlJywgW3RoaXNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IHRoZSBjb21wb25lbnQgaW4gYSBkaXNhYmxlZCBzdGF0ZS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGlzYWJsZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgdGhpcy5jb250YWluZXIuYWRkQ2xhc3MoJ21zLWN0bi1kaXNhYmxlZCcpO1xuICAgICAgICAgICAgY2ZnLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIG1zLmlucHV0LmF0dHIoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVtcHRpZXMgb3V0IHRoZSBjb21ibyB1c2VyIHRleHRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZW1wdHkgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5pbnB1dC52YWwoJycpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXQgdGhlIGNvbXBvbmVudCBpbiBhIGVuYWJsZSBzdGF0ZS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZW5hYmxlID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5yZW1vdmVDbGFzcygnbXMtY3RuLWRpc2FibGVkJyk7XG4gICAgICAgICAgICBjZmcuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIG1zLmlucHV0LmF0dHIoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFeHBhbmQgdGhlIGRyb3AgZHJvd24gcGFydCBvZiB0aGUgY29tYm8uXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmV4cGFuZCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKCFjZmcuZXhwYW5kZWQgJiYgKHRoaXMuaW5wdXQudmFsKCkubGVuZ3RoID49IGNmZy5taW5DaGFycyB8fCB0aGlzLmNvbWJvYm94LmNoaWxkcmVuKCkuc2l6ZSgpID4gMCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbWJvYm94LmFwcGVuZFRvKHRoaXMuY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICBjZmcuZXhwYW5kZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICQodGhpcykudHJpZ2dlcignZXhwYW5kJywgW3RoaXNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0cmlldmUgY29tcG9uZW50IGVuYWJsZWQgc3RhdHVzXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmlzRGlzYWJsZWQgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiBjZmcuZGlzYWJsZWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENoZWNrcyB3aGV0aGVyIHRoZSBmaWVsZCBpcyB2YWxpZCBvciBub3RcbiAgICAgICAgICogQHJldHVybiB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaXNWYWxpZCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHZhbGlkID0gY2ZnLnJlcXVpcmVkID09PSBmYWxzZSB8fCBfc2VsZWN0aW9uLmxlbmd0aCA+IDA7XG4gICAgICAgICAgICBpZihjZmcudnR5cGUgfHwgY2ZnLnZyZWdleCl7XG4gICAgICAgICAgICAgICAgJC5lYWNoKF9zZWxlY3Rpb24sIGZ1bmN0aW9uKGluZGV4LCBpdGVtKXtcbiAgICAgICAgICAgICAgICAgICAgdmFsaWQgPSB2YWxpZCAmJiBzZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0oaXRlbVtjZmcudmFsdWVGaWVsZF0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHZhbGlkO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXRzIHRoZSBkYXRhIHBhcmFtcyBmb3IgY3VycmVudCBhamF4IHJlcXVlc3RcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0RGF0YVVybFBhcmFtcyA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIGNmZy5kYXRhVXJsUGFyYW1zO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXRzIHRoZSBuYW1lIGdpdmVuIHRvIHRoZSBmb3JtIGlucHV0XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldE5hbWUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiBjZmcubmFtZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0cmlldmUgYW4gYXJyYXkgb2Ygc2VsZWN0ZWQganNvbiBvYmplY3RzXG4gICAgICAgICAqIEByZXR1cm4ge0FycmF5fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXRTZWxlY3Rpb24gPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiBfc2VsZWN0aW9uO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXRyaWV2ZSB0aGUgY3VycmVudCB0ZXh0IGVudGVyZWQgYnkgdGhlIHVzZXJcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0UmF3VmFsdWUgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmV0dXJuIG1zLmlucHV0LnZhbCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXRyaWV2ZSBhbiBhcnJheSBvZiBzZWxlY3RlZCB2YWx1ZXNcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0VmFsdWUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkLm1hcChfc2VsZWN0aW9uLCBmdW5jdGlvbihvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9bY2ZnLnZhbHVlRmllbGRdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZSBvbmUgb3IgbXVsdGlwbGVzIGpzb24gaXRlbXMgZnJvbSB0aGUgY3VycmVudCBzZWxlY3Rpb25cbiAgICAgICAgICogQHBhcmFtIGl0ZW1zIC0ganNvbiBvYmplY3Qgb3IgYXJyYXkgb2YganNvbiBvYmplY3RzXG4gICAgICAgICAqIEBwYXJhbSBpc1NpbGVudCAtIChvcHRpb25hbCkgc2V0IHRvIHRydWUgdG8gc3VwcHJlc3MgJ3NlbGVjdGlvbmNoYW5nZScgZXZlbnQgZnJvbSBiZWluZyB0cmlnZ2VyZWRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucmVtb3ZlRnJvbVNlbGVjdGlvbiA9IGZ1bmN0aW9uKGl0ZW1zLCBpc1NpbGVudClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKCEkLmlzQXJyYXkoaXRlbXMpKSB7XG4gICAgICAgICAgICAgICAgaXRlbXMgPSBbaXRlbXNdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHZhbHVlY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICAgICAgJC5lYWNoKGl0ZW1zLCBmdW5jdGlvbihpbmRleCwganNvbikge1xuICAgICAgICAgICAgICAgIHZhciBpID0gJC5pbkFycmF5KGpzb25bY2ZnLnZhbHVlRmllbGRdLCBtcy5nZXRWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgICBpZiAoaSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIF9zZWxlY3Rpb24uc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZWNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHZhbHVlY2hhbmdlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmKGlzU2lsZW50ICE9PSB0cnVlKXtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdzZWxlY3Rpb25jaGFuZ2UnLCBbdGhpcywgdGhpcy5nZXRTZWxlY3Rpb24oKV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kT25Gb2N1cyl7XG4gICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5pbnB1dC5hdHRyKCdwbGFjZWhvbGRlcicsIChjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgdGhpcy5nZXRWYWx1ZSgpLmxlbmd0aCA+IDApID8gJycgOiBjZmcucGxhY2Vob2xkZXIpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXQgY3VycmVudCBkYXRhXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldERhdGEgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmV0dXJuIF9jYkRhdGE7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldCB1cCBzb21lIGNvbWJvIGRhdGEgYWZ0ZXIgaXQgaGFzIGJlZW4gcmVuZGVyZWRcbiAgICAgICAgICogQHBhcmFtIGRhdGFcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgY2ZnLmRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldHMgdGhlIG5hbWUgZm9yIHRoZSBpbnB1dCBmaWVsZCBzbyBpdCBjYW4gYmUgZmV0Y2hlZCBpbiB0aGUgZm9ybVxuICAgICAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXROYW1lID0gZnVuY3Rpb24obmFtZSl7XG4gICAgICAgICAgICBjZmcubmFtZSA9IG5hbWU7XG4gICAgICAgICAgICBpZihuYW1lKXtcbiAgICAgICAgICAgICAgICBjZmcubmFtZSArPSBuYW1lLmluZGV4T2YoJ1tdJykgPiAwID8gJycgOiAnW10nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYobXMuX3ZhbHVlQ29udGFpbmVyKXtcbiAgICAgICAgICAgICAgICAkLmVhY2gobXMuX3ZhbHVlQ29udGFpbmVyLmNoaWxkcmVuKCksIGZ1bmN0aW9uKGksIGVsKXtcbiAgICAgICAgICAgICAgICAgICAgZWwubmFtZSA9IGNmZy5uYW1lO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIHRoZSBjdXJyZW50IHNlbGVjdGlvbiB3aXRoIHRoZSBKU09OIGl0ZW1zIHByb3ZpZGVkXG4gICAgICAgICAqIEBwYXJhbSBpdGVtc1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXRTZWxlY3Rpb24gPSBmdW5jdGlvbihpdGVtcyl7XG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLmFkZFRvU2VsZWN0aW9uKGl0ZW1zKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0cyBhIHZhbHVlIGZvciB0aGUgY29tYm8gYm94LiBWYWx1ZSBtdXN0IGJlIGFuIGFycmF5IG9mIHZhbHVlcyB3aXRoIGRhdGEgdHlwZSBtYXRjaGluZyB2YWx1ZUZpZWxkIG9uZS5cbiAgICAgICAgICogQHBhcmFtIGRhdGFcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZXMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBpdGVtcyA9IFtdO1xuXG4gICAgICAgICAgICAkLmVhY2godmFsdWVzLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBmaXJzdCB0cnkgdG8gc2VlIGlmIHdlIGhhdmUgdGhlIGZ1bGwgb2JqZWN0cyBmcm9tIG91ciBkYXRhIHNldFxuICAgICAgICAgICAgICAgIHZhciBmb3VuZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICQuZWFjaChfY2JEYXRhLCBmdW5jdGlvbihpLGl0ZW0pe1xuICAgICAgICAgICAgICAgICAgICBpZihpdGVtW2NmZy52YWx1ZUZpZWxkXSA9PSB2YWx1ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYoIWZvdW5kKXtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKHZhbHVlKSA9PT0gJ29iamVjdCcpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIganNvbiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbltjZmcudmFsdWVGaWVsZF0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25bY2ZnLmRpc3BsYXlGaWVsZF0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goanNvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmKGl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFRvU2VsZWN0aW9uKGl0ZW1zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0cyBkYXRhIHBhcmFtcyBmb3Igc3Vic2VxdWVudCBhamF4IHJlcXVlc3RzXG4gICAgICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2V0RGF0YVVybFBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcylcbiAgICAgICAge1xuICAgICAgICAgICAgY2ZnLmRhdGFVcmxQYXJhbXMgPSAkLmV4dGVuZCh7fSxwYXJhbXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKioqKioqKioqICBQUklWQVRFICoqKioqKioqKioqKi9cbiAgICAgICAgdmFyIF9zZWxlY3Rpb24gPSBbXSwgICAgICAvLyBzZWxlY3RlZCBvYmplY3RzXG4gICAgICAgICAgICBfY29tYm9JdGVtSGVpZ2h0ID0gMCwgLy8gaGVpZ2h0IGZvciBlYWNoIGNvbWJvIGl0ZW0uXG4gICAgICAgICAgICBfdGltZXIsXG4gICAgICAgICAgICBfaGFzRm9jdXMgPSBmYWxzZSxcbiAgICAgICAgICAgIF9ncm91cHMgPSBudWxsLFxuICAgICAgICAgICAgX2NiRGF0YSA9IFtdLFxuICAgICAgICAgICAgX2N0cmxEb3duID0gZmFsc2UsXG4gICAgICAgICAgICBLRVlDT0RFUyA9IHtcbiAgICAgICAgICAgICAgICBCQUNLU1BBQ0U6IDgsXG4gICAgICAgICAgICAgICAgVEFCOiA5LFxuICAgICAgICAgICAgICAgIEVOVEVSOiAxMyxcbiAgICAgICAgICAgICAgICBDVFJMOiAxNyxcbiAgICAgICAgICAgICAgICBFU0M6IDI3LFxuICAgICAgICAgICAgICAgIFNQQUNFOiAzMixcbiAgICAgICAgICAgICAgICBVUEFSUk9XOiAzOCxcbiAgICAgICAgICAgICAgICBET1dOQVJST1c6IDQwLFxuICAgICAgICAgICAgICAgIENPTU1BOiAxODhcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgdmFyIHNlbGYgPSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW1wdGllcyB0aGUgcmVzdWx0IGNvbnRhaW5lciBhbmQgcmVmaWxscyBpdCB3aXRoIHRoZSBhcnJheSBvZiBqc29uIHJlc3VsdHMgaW4gaW5wdXRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9kaXNwbGF5U3VnZ2VzdGlvbnM6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zaG93KCk7XG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3guZW1wdHkoKTtcblxuICAgICAgICAgICAgICAgIHZhciByZXNIZWlnaHQgPSAwLCAvLyB0b3RhbCBoZWlnaHQgdGFrZW4gYnkgZGlzcGxheWVkIHJlc3VsdHMuXG4gICAgICAgICAgICAgICAgICAgIG5iR3JvdXBzID0gMDtcblxuICAgICAgICAgICAgICAgIGlmKF9ncm91cHMgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyQ29tYm9JdGVtcyhkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzSGVpZ2h0ID0gX2NvbWJvSXRlbUhlaWdodCAqIGRhdGEubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBncnBOYW1lIGluIF9ncm91cHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5iR3JvdXBzICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXJlcy1ncm91cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogZ3JwTmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuYXBwZW5kVG8obXMuY29tYm9ib3gpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyQ29tYm9JdGVtcyhfZ3JvdXBzW2dycE5hbWVdLml0ZW1zLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgX2dyb3VwSXRlbUhlaWdodCA9IG1zLmNvbWJvYm94LmZpbmQoJy5tcy1yZXMtZ3JvdXAnKS5vdXRlckhlaWdodCgpO1xuICAgICAgICAgICAgICAgICAgICBpZihfZ3JvdXBJdGVtSGVpZ2h0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIHRtcFJlc0hlaWdodCA9IG5iR3JvdXBzICogX2dyb3VwSXRlbUhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICByZXNIZWlnaHQgPSAoX2NvbWJvSXRlbUhlaWdodCAqIGRhdGEubGVuZ3RoKSArIHRtcFJlc0hlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXNIZWlnaHQgPSBfY29tYm9JdGVtSGVpZ2h0ICogKGRhdGEubGVuZ3RoICsgbmJHcm91cHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYocmVzSGVpZ2h0IDwgbXMuY29tYm9ib3guaGVpZ2h0KCkgfHwgcmVzSGVpZ2h0IDw9IGNmZy5tYXhEcm9wSGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhlaWdodChyZXNIZWlnaHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHJlc0hlaWdodCA+PSBtcy5jb21ib2JveC5oZWlnaHQoKSAmJiByZXNIZWlnaHQgPiBjZmcubWF4RHJvcEhlaWdodCkge1xuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5oZWlnaHQoY2ZnLm1heERyb3BIZWlnaHQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID09PSAxICYmIGNmZy5hdXRvU2VsZWN0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmNoaWxkcmVuKCkuZmlsdGVyKCc6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6bGFzdCcpLmFkZENsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY2ZnLnNlbGVjdEZpcnN0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmNoaWxkcmVuKCkuZmlsdGVyKCc6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3QnKS5hZGRDbGFzcygnbXMtcmVzLWl0ZW0tYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPT09IDAgJiYgbXMuZ2V0UmF3VmFsdWUoKSAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbm9TdWdnZXN0aW9uVGV4dCA9IGNmZy5ub1N1Z2dlc3Rpb25UZXh0LnJlcGxhY2UoL1xce1xcey4qXFx9XFx9LywgbXMuaW5wdXQudmFsKCkpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIobm9TdWdnZXN0aW9uVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gV2hlbiBmcmVlIGVudHJ5IGlzIG9mZiwgYWRkIGludmFsaWQgY2xhc3MgdG8gaW5wdXQgaWYgbm8gZGF0YSBtYXRjaGVzXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmFsbG93RnJlZUVudHJpZXMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICQobXMuaW5wdXQpLmFkZENsYXNzKGNmZy5pbnZhbGlkQ2xzKTtcbiAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKG1zLmlucHV0KS5yZW1vdmVDbGFzcyhjZmcuaW52YWxpZENscyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIGpzb24gb2JqZWN0cyBmcm9tIGFuIGFycmF5IG9mIHN0cmluZ3MuXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfZ2V0RW50cmllc0Zyb21TdHJpbmdBcnJheTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBqc29uID0gW107XG4gICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uKGluZGV4LCBzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbnRyeSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBlbnRyeVtjZmcuZGlzcGxheUZpZWxkXSA9IGVudHJ5W2NmZy52YWx1ZUZpZWxkXSA9ICQudHJpbShzKTtcbiAgICAgICAgICAgICAgICAgICAganNvbi5wdXNoKGVudHJ5KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4ganNvbjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVwbGFjZXMgaHRtbCB3aXRoIGhpZ2hsaWdodGVkIGh0bWwgYWNjb3JkaW5nIHRvIGNhc2VcbiAgICAgICAgICAgICAqIEBwYXJhbSBodG1sXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfaGlnaGxpZ2h0U3VnZ2VzdGlvbjogZnVuY3Rpb24oaHRtbCkge1xuICAgICAgICAgICAgICAgIHZhciBxID0gbXMuaW5wdXQudmFsKCk7XG5cbiAgICAgICAgICAgICAgICAvL2VzY2FwZSBzcGVjaWFsIHJlZ2V4IGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICB2YXIgc3BlY2lhbENoYXJhY3RlcnMgPSBbJ14nLCAnJCcsICcqJywgJysnLCAnPycsICcuJywgJygnLCAnKScsICc6JywgJyEnLCAnfCcsICd7JywgJ30nLCAnWycsICddJ107XG5cbiAgICAgICAgICAgICAgICAkLmVhY2goc3BlY2lhbENoYXJhY3RlcnMsIGZ1bmN0aW9uIChpbmRleCwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcSA9IHEucmVwbGFjZSh2YWx1ZSwgXCJcXFxcXCIgKyB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgIGlmKHEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBodG1sOyAvLyBub3RoaW5nIGVudGVyZWQgYXMgaW5wdXRcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgZ2xvYiA9IGNmZy5tYXRjaENhc2UgPT09IHRydWUgPyAnZycgOiAnZ2knO1xuICAgICAgICAgICAgICAgIHJldHVybiBodG1sLnJlcGxhY2UobmV3IFJlZ0V4cCgnKCcgKyBxICsgJykoPyEoW148XSspPz4pJywgZ2xvYiksICc8ZW0+JDE8L2VtPicpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBNb3ZlcyB0aGUgc2VsZWN0ZWQgY3Vyc29yIGFtb25nc3QgdGhlIGxpc3QgaXRlbVxuICAgICAgICAgICAgICogQHBhcmFtIGRpciAtICd1cCcgb3IgJ2Rvd24nXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfbW92ZVNlbGVjdGVkUm93OiBmdW5jdGlvbihkaXIpIHtcbiAgICAgICAgICAgICAgICBpZighY2ZnLmV4cGFuZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgbGlzdCwgc3RhcnQsIGFjdGl2ZSwgc2Nyb2xsUG9zO1xuICAgICAgICAgICAgICAgIGxpc3QgPSBtcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpXCIpO1xuICAgICAgICAgICAgICAgIGlmKGRpciA9PT0gJ2Rvd24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGlzdC5lcSgwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGlzdC5maWx0ZXIoJzpsYXN0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFjdGl2ZSA9IG1zLmNvbWJvYm94LmZpbmQoJy5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3QnKTtcbiAgICAgICAgICAgICAgICBpZihhY3RpdmUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBpZihkaXIgPT09ICdkb3duJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBhY3RpdmUubmV4dEFsbCgnLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpJykuZmlyc3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXJ0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGlzdC5lcSgwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFBvcyA9IG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2Nyb2xsVG9wKDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhcnRbMF0ub2Zmc2V0VG9wICsgc3RhcnQub3V0ZXJIZWlnaHQoKSA+IG1zLmNvbWJvYm94LmhlaWdodCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2Nyb2xsVG9wKHNjcm9sbFBvcyArIF9jb21ib0l0ZW1IZWlnaHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBhY3RpdmUucHJldkFsbCgnLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpJykuZmlyc3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXJ0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGlzdC5maWx0ZXIoJzpsYXN0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2Nyb2xsVG9wKF9jb21ib0l0ZW1IZWlnaHQgKiBsaXN0Lmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzdGFydFswXS5vZmZzZXRUb3AgPCBtcy5jb21ib2JveC5zY3JvbGxUb3AoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LnNjcm9sbFRvcChtcy5jb21ib2JveC5zY3JvbGxUb3AoKSAtIF9jb21ib0l0ZW1IZWlnaHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxpc3QucmVtb3ZlQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7XG4gICAgICAgICAgICAgICAgc3RhcnQuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFjY29yZGluZyB0byBnaXZlbiBkYXRhIGFuZCBxdWVyeSwgc29ydCBhbmQgYWRkIHN1Z2dlc3Rpb25zIGluIHRoZWlyIGNvbnRhaW5lclxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3Byb2Nlc3NTdWdnZXN0aW9uczogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGpzb24gPSBudWxsLCBkYXRhID0gc291cmNlIHx8IGNmZy5kYXRhO1xuICAgICAgICAgICAgICAgIGlmKGRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKGRhdGEpID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSBkYXRhLmNhbGwobXMsIG1zLmdldFJhd1ZhbHVlKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZihkYXRhKSA9PT0gJ3N0cmluZycpIHsgLy8gZ2V0IHJlc3VsdHMgZnJvbSBhamF4XG4gICAgICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdiZWZvcmVsb2FkJywgW21zXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlQYXJhbXNbY2ZnLnF1ZXJ5UGFyYW1dID0gbXMuaW5wdXQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gJC5leHRlbmQocXVlcnlQYXJhbXMsIGNmZy5kYXRhVXJsUGFyYW1zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQuYWpheCgkLmV4dGVuZCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogY2ZnLm1ldGhvZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGRhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZVNlbmQ6IGNmZy5iZWZvcmVTZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGFzeW5jRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb24gPSB0eXBlb2YoYXN5bmNEYXRhKSA9PT0gJ3N0cmluZycgPyBKU09OLnBhcnNlKGFzeW5jRGF0YSkgOiBhc3luY0RhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucyhqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignbG9hZCcsIFttcywganNvbl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihzZWxmLl9hc3luY1ZhbHVlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZXRWYWx1ZSh0eXBlb2Yoc2VsZi5fYXN5bmNWYWx1ZXMpID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2Uoc2VsZi5fYXN5bmNWYWx1ZXMpIDogc2VsZi5fYXN5bmNWYWx1ZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUoc2VsZi5fYXN5bmNWYWx1ZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3coXCJDb3VsZCBub3QgcmVhY2ggc2VydmVyXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIGNmZy5hamF4Q29uZmlnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7IC8vIHJlc3VsdHMgZnJvbSBsb2NhbCBhcnJheVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPiAwICYmIHR5cGVvZihkYXRhWzBdKSA9PT0gJ3N0cmluZycpIHsgLy8gcmVzdWx0cyBmcm9tIGFycmF5IG9mIHN0cmluZ3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2JEYXRhID0gc2VsZi5fZ2V0RW50cmllc0Zyb21TdHJpbmdBcnJheShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7IC8vIHJlZ3VsYXIganNvbiBhcnJheSBvciBqc29uIG9iamVjdCB3aXRoIHJlc3VsdHMgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2JEYXRhID0gZGF0YVtjZmcucmVzdWx0c0ZpZWxkXSB8fCBkYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBzb3J0ZWREYXRhID0gY2ZnLm1vZGUgPT09ICdyZW1vdGUnID8gX2NiRGF0YSA6IHNlbGYuX3NvcnRBbmRUcmltKF9jYkRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9kaXNwbGF5U3VnZ2VzdGlvbnMoc2VsZi5fZ3JvdXAoc29ydGVkRGF0YSkpO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZW5kZXIgdGhlIGNvbXBvbmVudCB0byB0aGUgZ2l2ZW4gaW5wdXQgRE9NIGVsZW1lbnRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9yZW5kZXI6IGZ1bmN0aW9uKGVsKSB7XG4gICAgICAgICAgICAgICAgbXMuc2V0TmFtZShjZmcubmFtZSk7ICAvLyBtYWtlIHN1cmUgdGhlIGZvcm0gbmFtZSBpcyBjb3JyZWN0XG4gICAgICAgICAgICAgICAgLy8gaG9sZHMgdGhlIG1haW4gZGl2LCB3aWxsIHJlbGF5IHRoZSBmb2N1cyBldmVudHMgdG8gdGhlIGNvbnRhaW5lZCBpbnB1dCBlbGVtZW50LlxuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lciA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLWN0biBmb3JtLWNvbnRyb2wgJyArIChjZmcucmVzdWx0QXNTdHJpbmcgPyAnbXMtYXMtc3RyaW5nICcgOiAnJykgKyBjZmcuY2xzICtcbiAgICAgICAgICAgICAgICAgICAgICAgICgkKGVsKS5oYXNDbGFzcygnaW5wdXQtbGcnKSA/ICcgaW5wdXQtbGcnIDogJycpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICgkKGVsKS5oYXNDbGFzcygnaW5wdXQtc20nKSA/ICcgaW5wdXQtc20nIDogJycpICtcbiAgICAgICAgICAgICAgICAgICAgICAgIChjZmcuZGlzYWJsZWQgPT09IHRydWUgPyAnIG1zLWN0bi1kaXNhYmxlZCcgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKGNmZy5lZGl0YWJsZSA9PT0gdHJ1ZSA/ICcnIDogJyBtcy1jdG4tcmVhZG9ubHknKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2ZnLmhpZGVUcmlnZ2VyID09PSBmYWxzZSA/ICcnIDogJyBtcy1uby10cmlnZ2VyJyksXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiBjZmcuc3R5bGUsXG4gICAgICAgICAgICAgICAgICAgIGlkOiBjZmcuaWRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuZm9jdXMoJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cywgdGhpcykpO1xuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5ibHVyKCQucHJveHkoaGFuZGxlcnMuX29uQmx1ciwgdGhpcykpO1xuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5rZXlkb3duKCQucHJveHkoaGFuZGxlcnMuX29uS2V5RG93biwgdGhpcykpO1xuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5rZXl1cCgkLnByb3h5KGhhbmRsZXJzLl9vbktleVVwLCB0aGlzKSk7XG5cbiAgICAgICAgICAgICAgICAvLyBob2xkcyB0aGUgaW5wdXQgZmllbGRcbiAgICAgICAgICAgICAgICBtcy5pbnB1dCA9ICQoJzxpbnB1dC8+JywgJC5leHRlbmQoe1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgICAgICAgICAgICAgICdjbGFzcyc6IGNmZy5lZGl0YWJsZSA9PT0gdHJ1ZSA/ICcnIDogJyBtcy1pbnB1dC1yZWFkb25seScsXG4gICAgICAgICAgICAgICAgICAgIHJlYWRvbmx5OiAhY2ZnLmVkaXRhYmxlLFxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogY2ZnLnBsYWNlaG9sZGVyLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogY2ZnLmRpc2FibGVkXG4gICAgICAgICAgICAgICAgfSwgY2ZnLmlucHV0Q2ZnKSk7XG5cbiAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbklucHV0Rm9jdXMsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICBtcy5pbnB1dC5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vbklucHV0Q2xpY2ssIHRoaXMpKTtcblxuICAgICAgICAgICAgICAgIC8vIGhvbGRzIHRoZSBzdWdnZXN0aW9ucy4gd2lsbCBhbHdheXMgYmUgcGxhY2VkIG9uIGZvY3VzXG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3ggPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1yZXMtY3RuIGRyb3Bkb3duLW1lbnUnXG4gICAgICAgICAgICAgICAgfSkuaGVpZ2h0KGNmZy5tYXhEcm9wSGVpZ2h0KTtcblxuICAgICAgICAgICAgICAgIC8vIGJpbmQgdGhlIG9uY2xpY2sgYW5kIG1vdXNlb3ZlciB1c2luZyBkZWxlZ2F0ZWQgZXZlbnRzIChuZWVkcyBqUXVlcnkgPj0gMS43KVxuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94Lm9uKCdjbGljaycsICdkaXYubXMtcmVzLWl0ZW0nLCAkLnByb3h5KGhhbmRsZXJzLl9vbkNvbWJvSXRlbVNlbGVjdGVkLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3gub24oJ21vdXNlb3ZlcicsICdkaXYubXMtcmVzLWl0ZW0nLCAkLnByb3h5KGhhbmRsZXJzLl9vbkNvbWJvSXRlbU1vdXNlT3ZlciwgdGhpcykpO1xuXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7XG4gICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lciA9IGNmZy5zZWxlY3Rpb25Db250YWluZXI7XG4gICAgICAgICAgICAgICAgICAgICQobXMuc2VsZWN0aW9uQ29udGFpbmVyKS5hZGRDbGFzcygnbXMtc2VsLWN0bicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lciA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1zZWwtY3RuJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uRm9jdXMsIHRoaXMpKTtcblxuICAgICAgICAgICAgICAgIGlmKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiAhY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuYXBwZW5kKG1zLmlucHV0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hcHBlbmQobXMuaW5wdXQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG1zLmhlbHBlciA9ICQoJzxzcGFuLz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1oZWxwZXIgJyArIGNmZy5pbmZvTXNnQ2xzXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKCk7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFwcGVuZChtcy5oZWxwZXIpO1xuXG5cbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgdGhlIHdob2xlIHRoaW5nXG4gICAgICAgICAgICAgICAgJChlbCkucmVwbGFjZVdpdGgobXMuY29udGFpbmVyKTtcblxuICAgICAgICAgICAgICAgIGlmKCFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnYm90dG9tJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuaW5zZXJ0QWZ0ZXIobXMuY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuc2VsZWN0aW9uU3RhY2tlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIud2lkdGgobXMuY29udGFpbmVyLndpZHRoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuYWRkQ2xhc3MoJ21zLXN0YWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdyaWdodCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmluc2VydEFmdGVyKG1zLmNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmNzcygnZmxvYXQnLCAnbGVmdCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYXBwZW5kKG1zLnNlbGVjdGlvbkNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgICAgIC8vIGhvbGRzIHRoZSB0cmlnZ2VyIG9uIHRoZSByaWdodCBzaWRlXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmhpZGVUcmlnZ2VyID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBtcy50cmlnZ2VyID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXRyaWdnZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogJzxkaXYgY2xhc3M9XCJtcy10cmlnZ2VyLWljb1wiPjwvZGl2PidcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIG1zLnRyaWdnZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25UcmlnZ2VyQ2xpY2ssIHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFwcGVuZChtcy50cmlnZ2VyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkKHdpbmRvdykucmVzaXplKCQucHJveHkoaGFuZGxlcnMuX29uV2luZG93UmVzaXplZCwgdGhpcykpO1xuXG4gICAgICAgICAgICAgICAgLy8gZG8gbm90IHBlcmZvcm0gYW4gaW5pdGlhbCBjYWxsIGlmIHdlIGFyZSB1c2luZyBhamF4IHVubGVzcyB3ZSBoYXZlIGluaXRpYWwgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnZhbHVlICE9PSBudWxsIHx8IGNmZy5kYXRhICE9PSBudWxsKXtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKGNmZy5kYXRhKSA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fYXN5bmNWYWx1ZXMgPSBjZmcudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLnZhbHVlICE9PSBudWxsKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZXRWYWx1ZShjZmcudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkKFwiYm9keVwiKS5jbGljayhmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKG1zLmNvbnRhaW5lci5oYXNDbGFzcygnbXMtY3RuLWZvY3VzJykgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5oYXMoZS50YXJnZXQpLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgZS50YXJnZXQuY2xhc3NOYW1lLmluZGV4T2YoJ21zLXJlcy1pdGVtJykgPCAwICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZignbXMtY2xvc2UtYnRuJykgPCAwICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXJbMF0gIT09IGUudGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5fb25CbHVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjZmcuZXhwYW5kZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZW5kZXJzIGVhY2ggZWxlbWVudCB3aXRoaW4gdGhlIGNvbWJvIGJveFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3JlbmRlckNvbWJvSXRlbXM6IGZ1bmN0aW9uKGl0ZW1zLCBpc0dyb3VwZWQpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVmID0gdGhpcywgaHRtbCA9ICcnO1xuICAgICAgICAgICAgICAgICQuZWFjaChpdGVtcywgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkaXNwbGF5ZWQgPSBjZmcucmVuZGVyZXIgIT09IG51bGwgPyBjZmcucmVuZGVyZXIuY2FsbChyZWYsIHZhbHVlKSA6IHZhbHVlW2NmZy5kaXNwbGF5RmllbGRdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGlzYWJsZWQgPSBjZmcuZGlzYWJsZWRGaWVsZCAhPT0gbnVsbCAmJiB2YWx1ZVtjZmcuZGlzYWJsZWRGaWVsZF0gPT09IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHRJdGVtRWwgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtcmVzLWl0ZW0gJyArIChpc0dyb3VwZWQgPyAnbXMtcmVzLWl0ZW0tZ3JvdXBlZCAnOicnKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGRpc2FibGVkID8gJ21zLXJlcy1pdGVtLWRpc2FibGVkICc6JycpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoaW5kZXggJSAyID09PSAxICYmIGNmZy51c2VaZWJyYVN0eWxlID09PSB0cnVlID8gJ21zLXJlcy1vZGQnIDogJycpLFxuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogY2ZnLmhpZ2hsaWdodCA9PT0gdHJ1ZSA/IHNlbGYuX2hpZ2hsaWdodFN1Z2dlc3Rpb24oZGlzcGxheWVkKSA6IGRpc3BsYXllZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICdkYXRhLWpzb24nOiBKU09OLnN0cmluZ2lmeSh2YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJCgnPGRpdi8+JykuYXBwZW5kKHJlc3VsdEl0ZW1FbCkuaHRtbCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmFwcGVuZChodG1sKTtcbiAgICAgICAgICAgICAgICBfY29tYm9JdGVtSGVpZ2h0ID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1pdGVtOmZpcnN0Jykub3V0ZXJIZWlnaHQoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVuZGVycyB0aGUgc2VsZWN0ZWQgaXRlbXMgaW50byB0aGVpciBjb250YWluZXIuXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfcmVuZGVyU2VsZWN0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVmID0gdGhpcywgdyA9IDAsIGlucHV0T2Zmc2V0ID0gMCwgaXRlbXMgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgYXNUZXh0ID0gY2ZnLnJlc3VsdEFzU3RyaW5nID09PSB0cnVlICYmICFfaGFzRm9jdXM7XG5cbiAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuZmluZCgnLm1zLXNlbC1pdGVtJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgaWYobXMuX3ZhbHVlQ29udGFpbmVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuX3ZhbHVlQ29udGFpbmVyLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICQuZWFjaChfc2VsZWN0aW9uLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpe1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RlZEl0ZW1FbCwgZGVsSXRlbUVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtSHRtbCA9IGNmZy5zZWxlY3Rpb25SZW5kZXJlciAhPT0gbnVsbCA/IGNmZy5zZWxlY3Rpb25SZW5kZXJlci5jYWxsKHJlZiwgdmFsdWUpIDogdmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbGlkQ2xzID0gc2VsZi5fdmFsaWRhdGVTaW5nbGVJdGVtKHZhbHVlW2NmZy5kaXNwbGF5RmllbGRdKSA/ICcnIDogJyBtcy1zZWwtaW52YWxpZCc7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gdGFnIHJlcHJlc2VudGluZyBzZWxlY3RlZCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBpZihhc1RleHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbUVsID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1zZWwtaXRlbSBtcy1zZWwtdGV4dCAnICsgY2ZnLnNlbGVjdGlvbkNscyArIHZhbGlkQ2xzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IHNlbGVjdGVkSXRlbUh0bWwgKyAoaW5kZXggPT09IChfc2VsZWN0aW9uLmxlbmd0aCAtIDEpID8gJycgOiBjZmcucmVzdWx0QXNTdHJpbmdEZWxpbWl0ZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5kYXRhKCdqc29uJywgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtRWwgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXNlbC1pdGVtICcgKyBjZmcuc2VsZWN0aW9uQ2xzICsgdmFsaWRDbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogc2VsZWN0ZWRJdGVtSHRtbFxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuZGF0YSgnanNvbicsIHZhbHVlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmRpc2FibGVkID09PSBmYWxzZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc21hbGwgY3Jvc3MgaW1nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsSXRlbUVsID0gJCgnPHNwYW4vPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLWNsb3NlLWJ0bidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5kYXRhKCdqc29uJywgdmFsdWUpLmFwcGVuZFRvKHNlbGVjdGVkSXRlbUVsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbEl0ZW1FbC5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRhZ1RyaWdnZXJDbGljaywgcmVmKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHNlbGVjdGVkSXRlbUVsKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIucHJlcGVuZChpdGVtcyk7XG5cbiAgICAgICAgICAgICAgICAvLyBzdG9yZSB0aGUgdmFsdWVzLCBiZWhhdmlvdXIgb2YgbXVsdGlwbGUgc2VsZWN0XG4gICAgICAgICAgICAgICAgbXMuX3ZhbHVlQ29udGFpbmVyID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICBzdHlsZTogJ2Rpc3BsYXk6IG5vbmU7J1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICQuZWFjaChtcy5nZXRWYWx1ZSgpLCBmdW5jdGlvbihpLCB2YWwpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgZWwgPSAkKCc8aW5wdXQvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdoaWRkZW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY2ZnLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBlbC5hcHBlbmRUbyhtcy5fdmFsdWVDb250YWluZXIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG1zLl92YWx1ZUNvbnRhaW5lci5hcHBlbmRUbyhtcy5zZWxlY3Rpb25Db250YWluZXIpO1xuXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmICFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LndpZHRoKDApO1xuICAgICAgICAgICAgICAgICAgICBpbnB1dE9mZnNldCA9IG1zLmlucHV0Lm9mZnNldCgpLmxlZnQgLSBtcy5zZWxlY3Rpb25Db250YWluZXIub2Zmc2V0KCkubGVmdDtcbiAgICAgICAgICAgICAgICAgICAgdyA9IG1zLmNvbnRhaW5lci53aWR0aCgpIC0gaW5wdXRPZmZzZXQgLSA0MjtcbiAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQud2lkdGgodyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYoX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcywgX3NlbGVjdGlvbi5sZW5ndGgpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtcy5oZWxwZXIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2VsZWN0IGFuIGl0ZW0gZWl0aGVyIHRocm91Z2gga2V5Ym9hcmQgb3IgbW91c2VcbiAgICAgICAgICAgICAqIEBwYXJhbSBpdGVtXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfc2VsZWN0SXRlbTogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgICAgIGlmKGNmZy5tYXhTZWxlY3Rpb24gPT09IDEpe1xuICAgICAgICAgICAgICAgICAgICBfc2VsZWN0aW9uID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1zLmFkZFRvU2VsZWN0aW9uKGl0ZW0uZGF0YSgnanNvbicpKTtcbiAgICAgICAgICAgICAgICBpdGVtLnJlbW92ZUNsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcbiAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kT25Gb2N1cyA9PT0gZmFsc2UgfHwgX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pe1xuICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZighX2hhc0ZvY3VzKXtcbiAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYoX2hhc0ZvY3VzICYmIChjZmcuZXhwYW5kT25Gb2N1cyB8fCBfY3RybERvd24pKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKF9jdHJsRG93bil7XG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU29ydHMgdGhlIHJlc3VsdHMgYW5kIGN1dCB0aGVtIGRvd24gdG8gbWF4ICMgb2YgZGlzcGxheWVkIHJlc3VsdHMgYXQgb25jZVxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3NvcnRBbmRUcmltOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIHEgPSBtcy5nZXRSYXdWYWx1ZSgpLFxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZCA9IFtdLFxuICAgICAgICAgICAgICAgICAgICBuZXdTdWdnZXN0aW9ucyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZFZhbHVlcyA9IG1zLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgLy8gZmlsdGVyIHRoZSBkYXRhIGFjY29yZGluZyB0byBnaXZlbiBpbnB1dFxuICAgICAgICAgICAgICAgIGlmKHEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24oaW5kZXgsIG9iaikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBvYmpbY2ZnLmRpc3BsYXlGaWVsZF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZigoY2ZnLm1hdGNoQ2FzZSA9PT0gdHJ1ZSAmJiBuYW1lLmluZGV4T2YocSkgPiAtMSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoY2ZnLm1hdGNoQ2FzZSA9PT0gZmFsc2UgJiYgbmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocS50b0xvd2VyQ2FzZSgpKSA+IC0xKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5zdHJpY3RTdWdnZXN0ID09PSBmYWxzZSB8fCBuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkLnB1c2gob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQgPSBkYXRhO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyB0YWtlIG91dCB0aGUgb25lcyB0aGF0IGhhdmUgYWxyZWFkeSBiZWVuIHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgJC5lYWNoKGZpbHRlcmVkLCBmdW5jdGlvbihpbmRleCwgb2JqKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjZmcuYWxsb3dEdXBsaWNhdGVzIHx8ICQuaW5BcnJheShvYmpbY2ZnLnZhbHVlRmllbGRdLCBzZWxlY3RlZFZhbHVlcykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdTdWdnZXN0aW9ucy5wdXNoKG9iaik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyBzb3J0IHRoZSBkYXRhXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnNvcnRPcmRlciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBuZXdTdWdnZXN0aW9ucy5zb3J0KGZ1bmN0aW9uKGEsYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYVtjZmcuc29ydE9yZGVyXSA8IGJbY2ZnLnNvcnRPcmRlcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2ZnLnNvcnREaXIgPT09ICdhc2MnID8gLTEgOiAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYVtjZmcuc29ydE9yZGVyXSA+IGJbY2ZnLnNvcnRPcmRlcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2ZnLnNvcnREaXIgPT09ICdhc2MnID8gMSA6IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyB0cmltIGl0IGRvd25cbiAgICAgICAgICAgICAgICBpZihjZmcubWF4U3VnZ2VzdGlvbnMgJiYgY2ZnLm1heFN1Z2dlc3Rpb25zID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBuZXdTdWdnZXN0aW9ucyA9IG5ld1N1Z2dlc3Rpb25zLnNsaWNlKDAsIGNmZy5tYXhTdWdnZXN0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXdTdWdnZXN0aW9ucztcblxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX2dyb3VwOiBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAvLyBidWlsZCBncm91cHNcbiAgICAgICAgICAgICAgICBpZihjZmcuZ3JvdXBCeSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBfZ3JvdXBzID0ge307XG5cbiAgICAgICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByb3BzID0gY2ZnLmdyb3VwQnkuaW5kZXhPZignLicpID4gLTEgPyBjZmcuZ3JvdXBCeS5zcGxpdCgnLicpIDogY2ZnLmdyb3VwQnk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcCA9IHZhbHVlW2NmZy5ncm91cEJ5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZihwcm9wcykgIT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3AgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZShwcm9wcy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcCA9IHByb3BbcHJvcHMuc2hpZnQoKV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoX2dyb3Vwc1twcm9wXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2dyb3Vwc1twcm9wXSA9IHt0aXRsZTogcHJvcCwgaXRlbXM6IFt2YWx1ZV19O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2dyb3Vwc1twcm9wXS5pdGVtcy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBVcGRhdGUgdGhlIGhlbHBlciB0ZXh0XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfdXBkYXRlSGVscGVyOiBmdW5jdGlvbihodG1sKSB7XG4gICAgICAgICAgICAgICAgbXMuaGVscGVyLmh0bWwoaHRtbCk7XG4gICAgICAgICAgICAgICAgaWYoIW1zLmhlbHBlci5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmhlbHBlci5mYWRlSW4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFZhbGlkYXRlIGFuIGl0ZW0gYWdhaW5zdCB2dHlwZSBvciB2cmVnZXhcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF92YWxpZGF0ZVNpbmdsZUl0ZW06IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgICAgICAgICBpZihjZmcudnJlZ2V4ICE9PSBudWxsICYmIGNmZy52cmVnZXggaW5zdGFuY2VvZiBSZWdFeHApe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2ZnLnZyZWdleC50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYoY2ZnLnZ0eXBlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaChjZmcudnR5cGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnYWxwaGEnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvXlthLXpBLVpfXSskLykudGVzdCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdhbHBoYW51bSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC9eW2EtekEtWjAtOV9dKyQvKS50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2VtYWlsJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoL14oXFx3KykoW1xcLSsuXVtcXHddKykqQChcXHdbXFwtXFx3XSpcXC4pezEsNX0oW0EtWmEtel0pezIsNn0kLykudGVzdCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICd1cmwnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvKCgoXmh0dHBzPyl8KF5mdHApKTpcXC9cXC8oW1xcLVxcd10rXFwuKStcXHd7MiwzfShcXC9bJVxcLVxcd10rKFxcLlxcd3syLH0pPykqKChbXFx3XFwtXFwuXFw/XFxcXFxcLytAJiM7YH49JSFdKikoXFwuXFx3ezIsfSk/KSpcXC8/KS9pKS50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2lwYWRkcmVzcyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC9eXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM30kLykudGVzdCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGhhbmRsZXJzID0ge1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBibHVycmluZyBvdXQgb2YgdGhlIGNvbXBvbmVudFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uQmx1cjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKCdtcy1jdG4tZm9jdXMnKTtcbiAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xuICAgICAgICAgICAgICAgIF9oYXNGb2N1cyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmKG1zLmdldFJhd1ZhbHVlKCkgIT09ICcnICYmIGNmZy5hbGxvd0ZyZWVFbnRyaWVzID09PSB0cnVlKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBvYmpbY2ZnLmRpc3BsYXlGaWVsZF0gPSBvYmpbY2ZnLnZhbHVlRmllbGRdID0gbXMuZ2V0UmF3VmFsdWUoKS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIG1zLmFkZFRvU2VsZWN0aW9uKG9iaik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuXG4gICAgICAgICAgICAgICAgaWYobXMuaXNWYWxpZCgpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGVsc2UgaWYobXMuaW5wdXQudmFsKCkgIT09ICcnICYmIGNmZy5hbGxvd0ZyZWVFbnRyaWVzID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBtcy5lbXB0eSgpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoJycpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2JsdXInLCBbbXNdKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gaG92ZXJpbmcgYW4gZWxlbWVudCBpbiB0aGUgY29tYm9cbiAgICAgICAgICAgICAqIEBwYXJhbSBlXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25Db21ib0l0ZW1Nb3VzZU92ZXI6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgICAgIGlmKCF0YXJnZXQuaGFzQ2xhc3MoJ21zLXJlcy1pdGVtLWRpc2FibGVkJykpe1xuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5jaGlsZHJlbigpLnJlbW92ZUNsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmFkZENsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGFuIGl0ZW0gaXMgY2hvc2VuIGZyb20gdGhlIGxpc3RcbiAgICAgICAgICAgICAqIEBwYXJhbSBlXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25Db21ib0l0ZW1TZWxlY3RlZDogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICAgICAgaWYoIXRhcmdldC5oYXNDbGFzcygnbXMtcmVzLWl0ZW0tZGlzYWJsZWQnKSl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3NlbGVjdEl0ZW0oJChlLmN1cnJlbnRUYXJnZXQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGZvY3VzaW5nIG9uIHRoZSBjb250YWluZXIgZGl2LiBXaWxsIGZvY3VzIG9uIHRoZSBpbnB1dCBmaWVsZCBpbnN0ZWFkLlxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uRm9jdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGNsaWNraW5nIG9uIHRoZSBpbnB1dCB0ZXh0IGZpZWxkXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25JbnB1dENsaWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGlmIChtcy5pc0Rpc2FibGVkKCkgPT09IGZhbHNlICYmIF9oYXNGb2N1cykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ZnLnRvZ2dsZU9uQ2xpY2sgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjZmcuZXhwYW5kZWQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBmb2N1c2luZyBvbiB0aGUgaW5wdXQgdGV4dCBmaWVsZC5cbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbklucHV0Rm9jdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmKG1zLmlzRGlzYWJsZWQoKSA9PT0gZmFsc2UgJiYgIV9oYXNGb2N1cykge1xuICAgICAgICAgICAgICAgICAgICBfaGFzRm9jdXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYWRkQ2xhc3MoJ21zLWN0bi1mb2N1cycpO1xuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoY2ZnLmludmFsaWRDbHMpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBjdXJMZW5ndGggPSBtcy5nZXRSYXdWYWx1ZSgpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZE9uRm9jdXMgPT09IHRydWUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZihfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsIF9zZWxlY3Rpb24ubGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZihjdXJMZW5ndGggPCBjZmcubWluQ2hhcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsIGNmZy5taW5DaGFycyAtIGN1ckxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2ZvY3VzJywgW21zXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiB0aGUgdXNlciBwcmVzc2VzIGEga2V5IHdoaWxlIHRoZSBjb21wb25lbnQgaGFzIGZvY3VzXG4gICAgICAgICAgICAgKiBUaGlzIGlzIHdoZXJlIHdlIHdhbnQgdG8gaGFuZGxlIGFsbCBrZXlzIHRoYXQgZG9uJ3QgcmVxdWlyZSB0aGUgdXNlciBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICogc2luY2UgaXQgaGFzbid0IHJlZ2lzdGVyZWQgdGhlIGtleSBoaXQgeWV0XG4gICAgICAgICAgICAgKiBAcGFyYW0gZSBrZXlFdmVudFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uS2V5RG93bjogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIC8vIGNoZWNrIGhvdyB0YWIgc2hvdWxkIGJlIGhhbmRsZWRcbiAgICAgICAgICAgICAgICB2YXIgYWN0aXZlID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpLFxuICAgICAgICAgICAgICAgICAgICBmcmVlSW5wdXQgPSBtcy5pbnB1dC52YWwoKTtcbiAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdrZXlkb3duJywgW21zLCBlXSk7XG5cbiAgICAgICAgICAgICAgICBpZihlLmtleUNvZGUgPT09IEtFWUNPREVTLlRBQiAmJiAoY2ZnLnVzZVRhYktleSA9PT0gZmFsc2UgfHxcbiAgICAgICAgICAgICAgICAgICAgKGNmZy51c2VUYWJLZXkgPT09IHRydWUgJiYgYWN0aXZlLmxlbmd0aCA9PT0gMCAmJiBtcy5pbnB1dC52YWwoKS5sZW5ndGggPT09IDApKSkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5fb25CbHVyKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3dpdGNoKGUua2V5Q29kZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkJBQ0tTUEFDRTpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGZyZWVJbnB1dC5sZW5ndGggPT09IDAgJiYgbXMuZ2V0U2VsZWN0aW9uKCkubGVuZ3RoID4gMCAmJiBjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfc2VsZWN0aW9uLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ3NlbGVjdGlvbmNoYW5nZScsIFttcywgbXMuZ2V0U2VsZWN0aW9uKCldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5hdHRyKCdwbGFjZWhvbGRlcicsIChjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgbXMuZ2V0VmFsdWUoKS5sZW5ndGggPiAwKSA/ICcnIDogY2ZnLnBsYWNlaG9sZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLlRBQjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5FU0M6XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5FTlRFUjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGZyZWVJbnB1dCAhPT0gJycgfHwgY2ZnLmV4cGFuZGVkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5DT01NQTpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy51c2VDb21tYUtleSA9PT0gdHJ1ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuQ1RSTDpcbiAgICAgICAgICAgICAgICAgICAgICAgIF9jdHJsRG93biA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5ET1dOQVJST1c6XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9tb3ZlU2VsZWN0ZWRSb3coXCJkb3duXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVVBBUlJPVzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX21vdmVTZWxlY3RlZFJvdyhcInVwXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gYSBrZXkgaXMgcmVsZWFzZWQgd2hpbGUgdGhlIGNvbXBvbmVudCBoYXMgZm9jdXNcbiAgICAgICAgICAgICAqIEBwYXJhbSBlXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25LZXlVcDogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIHZhciBmcmVlSW5wdXQgPSBtcy5nZXRSYXdWYWx1ZSgpLFxuICAgICAgICAgICAgICAgICAgICBpbnB1dFZhbGlkID0gJC50cmltKG1zLmlucHV0LnZhbCgpKS5sZW5ndGggPiAwICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAoIWNmZy5tYXhFbnRyeUxlbmd0aCB8fCAkLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aCA8PSBjZmcubWF4RW50cnlMZW5ndGgpLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZCxcbiAgICAgICAgICAgICAgICAgICAgb2JqID0ge307XG5cbiAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdrZXl1cCcsIFttcywgZV0pO1xuXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aW1lcik7XG5cbiAgICAgICAgICAgICAgICAvLyBjb2xsYXBzZSBpZiBlc2NhcGUsIGJ1dCBrZWVwIGZvY3VzLlxuICAgICAgICAgICAgICAgIGlmKGUua2V5Q29kZSA9PT0gS0VZQ09ERVMuRVNDICYmIGNmZy5leHBhbmRlZCkge1xuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlnbm9yZSBhIGJ1bmNoIG9mIGtleXNcbiAgICAgICAgICAgICAgICBpZigoZS5rZXlDb2RlID09PSBLRVlDT0RFUy5UQUIgJiYgY2ZnLnVzZVRhYktleSA9PT0gZmFsc2UpIHx8IChlLmtleUNvZGUgPiBLRVlDT0RFUy5FTlRFUiAmJiBlLmtleUNvZGUgPCBLRVlDT0RFUy5TUEFDRSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoZS5rZXlDb2RlID09PSBLRVlDT0RFUy5DVFJMKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9jdHJsRG93biA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3dpdGNoKGUua2V5Q29kZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLlVQQVJST1c6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuRE9XTkFSUk9XOlxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkVOVEVSOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLlRBQjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5DT01NQTpcbiAgICAgICAgICAgICAgICAgICAgaWYoZS5rZXlDb2RlICE9PSBLRVlDT0RFUy5DT01NQSB8fCBjZmcudXNlQ29tbWFLZXkgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSl7IC8vIGlmIGEgc2VsZWN0aW9uIGlzIHBlcmZvcm1lZCwgc2VsZWN0IGl0IGFuZCByZXNldCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHNlbGVjdGVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0SXRlbShzZWxlY3RlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiBubyBzZWxlY3Rpb24gb3IgaWYgZnJlZXRleHQgZW50ZXJlZCBhbmQgZnJlZSBlbnRyaWVzIGFsbG93ZWQsIGFkZCBuZXcgb2JqIHRvIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaW5wdXRWYWxpZCA9PT0gdHJ1ZSAmJiBjZmcuYWxsb3dGcmVlRW50cmllcyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ialtjZmcuZGlzcGxheUZpZWxkXSA9IG9ialtjZmcudmFsdWVGaWVsZF0gPSBmcmVlSW5wdXQudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmFkZFRvU2VsZWN0aW9uKG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTsgLy8gcmVzZXQgY29tYm8gc3VnZ2VzdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcywgX3NlbGVjdGlvbi5sZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGZyZWVJbnB1dC5sZW5ndGggPCBjZmcubWluQ2hhcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcywgY2ZnLm1pbkNoYXJzIC0gZnJlZUlucHV0Lmxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZihjZmcubWF4RW50cnlMZW5ndGggJiYgZnJlZUlucHV0Lmxlbmd0aCA+IGNmZy5tYXhFbnRyeUxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heEVudHJ5UmVuZGVyZXIuY2FsbCh0aGlzLCBmcmVlSW5wdXQubGVuZ3RoIC0gY2ZnLm1heEVudHJ5TGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuaGVscGVyLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLm1pbkNoYXJzIDw9IGZyZWVJbnB1dC5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgY2ZnLnR5cGVEZWxheSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGNsaWNraW5nIHVwb24gY3Jvc3MgZm9yIGRlbGV0aW9uXG4gICAgICAgICAgICAgKiBAcGFyYW0gZVxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uVGFnVHJpZ2dlckNsaWNrOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgbXMucmVtb3ZlRnJvbVNlbGVjdGlvbigkKGUuY3VycmVudFRhcmdldCkuZGF0YSgnanNvbicpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gY2xpY2tpbmcgb24gdGhlIHNtYWxsIHRyaWdnZXIgaW4gdGhlIHJpZ2h0XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25UcmlnZ2VyQ2xpY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmKG1zLmlzRGlzYWJsZWQoKSA9PT0gZmFsc2UgJiYgIShjZmcuZXhwYW5kT25Gb2N1cyA9PT0gdHJ1ZSAmJiBfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcigndHJpZ2dlcmNsaWNrJywgW21zXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjdXJMZW5ndGggPSBtcy5nZXRSYXdWYWx1ZSgpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGN1ckxlbmd0aCA+PSBjZmcubWluQ2hhcnMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsIGNmZy5taW5DaGFycyAtIGN1ckxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiB0aGUgYnJvd3NlciB3aW5kb3cgaXMgcmVzaXplZFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uV2luZG93UmVzaXplZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gc3RhcnR1cCBwb2ludFxuICAgICAgICBpZihlbGVtZW50ICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZWxmLl9yZW5kZXIoZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJC5mbi5tYWdpY1N1Z2dlc3QgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBvYmogPSAkKHRoaXMpO1xuXG4gICAgICAgIGlmKG9iai5zaXplKCkgPT09IDEgJiYgb2JqLmRhdGEoJ21hZ2ljU3VnZ2VzdCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqLmRhdGEoJ21hZ2ljU3VnZ2VzdCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgb2JqLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgLy8gYXNzdW1lICQodGhpcykgaXMgYW4gZWxlbWVudFxuICAgICAgICAgICAgdmFyIGNudHIgPSAkKHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBSZXR1cm4gZWFybHkgaWYgdGhpcyBlbGVtZW50IGFscmVhZHkgaGFzIGEgcGx1Z2luIGluc3RhbmNlXG4gICAgICAgICAgICBpZihjbnRyLmRhdGEoJ21hZ2ljU3VnZ2VzdCcpKXtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHRoaXMubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3NlbGVjdCcpeyAvLyByZW5kZXJpbmcgZnJvbSBzZWxlY3RcbiAgICAgICAgICAgICAgICBvcHRpb25zLmRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnZhbHVlID0gW107XG4gICAgICAgICAgICAgICAgJC5lYWNoKHRoaXMuY2hpbGRyZW4sIGZ1bmN0aW9uKGluZGV4LCBjaGlsZCl7XG4gICAgICAgICAgICAgICAgICAgIGlmKGNoaWxkLm5vZGVOYW1lICYmIGNoaWxkLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdvcHRpb24nKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YS5wdXNoKHtpZDogY2hpbGQudmFsdWUsIG5hbWU6IGNoaWxkLnRleHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCQoY2hpbGQpLmF0dHIoJ3NlbGVjdGVkJykpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMudmFsdWUucHVzaChjaGlsZC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGRlZiA9IHt9O1xuICAgICAgICAgICAgLy8gc2V0IHZhbHVlcyBmcm9tIERPTSBjb250YWluZXIgZWxlbWVudFxuICAgICAgICAgICAgJC5lYWNoKHRoaXMuYXR0cmlidXRlcywgZnVuY3Rpb24oaSwgYXR0KXtcbiAgICAgICAgICAgICAgICBkZWZbYXR0Lm5hbWVdID0gYXR0Lm5hbWUgPT09ICd2YWx1ZScgJiYgYXR0LnZhbHVlICE9PSAnJyA/IEpTT04ucGFyc2UoYXR0LnZhbHVlKSA6IGF0dC52YWx1ZTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgZmllbGQgPSBuZXcgTWFnaWNTdWdnZXN0KHRoaXMsICQuZXh0ZW5kKFtdLCAkLmZuLm1hZ2ljU3VnZ2VzdC5kZWZhdWx0cywgb3B0aW9ucywgZGVmKSk7XG4gICAgICAgICAgICBjbnRyLmRhdGEoJ21hZ2ljU3VnZ2VzdCcsIGZpZWxkKTtcbiAgICAgICAgICAgIGZpZWxkLmNvbnRhaW5lci5kYXRhKCdtYWdpY1N1Z2dlc3QnLCBmaWVsZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmKG9iai5zaXplKCkgPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBvYmouZGF0YSgnbWFnaWNTdWdnZXN0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuXG4gICAkLmZuLm1hZ2ljU3VnZ2VzdC5kZWZhdWx0cyA9IHt9O1xufSkoalF1ZXJ5KTtcbiJdfQ==
