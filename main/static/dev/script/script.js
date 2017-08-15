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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1vbi9hcGkuY29mZmVlIiwiY29tbW9uL3V0aWwuY29mZmVlIiwic2l0ZS9hcHAuY29mZmVlIiwic2l0ZS9hdXRoLmNvZmZlZSIsInNpdGUvdXNlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQSxNQUFNLENBQUMsUUFBUCxHQUFrQixTQUFDLE1BQUQsRUFBUyxHQUFULEVBQWMsTUFBZCxFQUFzQixJQUF0QixFQUE0QixRQUE1QjtBQUNoQixRQUFBO0lBQUEsUUFBQSxHQUFXLFFBQUEsSUFBWSxJQUFaLElBQW9CO0lBQy9CLElBQUEsR0FBTyxJQUFBLElBQVE7SUFDZixJQUFHLFNBQVMsQ0FBQyxNQUFWLEtBQW9CLENBQXZCO01BQ0UsSUFBQSxHQUFPLE9BRFQ7O0lBRUEsSUFBRyxTQUFTLENBQUMsTUFBVixLQUFxQixDQUF4QjtNQUNFLE1BQUEsR0FBUztNQUNULElBQUEsR0FBTyxPQUZUOztJQUdBLE1BQUEsR0FBUyxNQUFBLElBQVU7QUFDbkIsU0FBQSxXQUFBOztNQUNFLElBQXdCLFNBQXhCO1FBQUEsT0FBTyxNQUFPLENBQUEsQ0FBQSxFQUFkOztBQURGO0lBRUEsU0FBQSxHQUFlLEdBQUcsQ0FBQyxNQUFKLENBQVcsS0FBWCxDQUFBLElBQXFCLENBQXhCLEdBQStCLEdBQS9CLEdBQXdDO1dBQ3BELENBQUMsQ0FBQyxJQUFGLENBQ0U7TUFBQSxJQUFBLEVBQU0sTUFBTjtNQUNBLEdBQUEsRUFBSyxFQUFBLEdBQUcsR0FBSCxHQUFTLFNBQVQsR0FBb0IsQ0FBQyxDQUFDLENBQUMsS0FBRixDQUFRLE1BQVIsQ0FBRCxDQUR6QjtNQUVBLFdBQUEsRUFBYSxrQkFGYjtNQUdBLE9BQUEsRUFBUyxrQkFIVDtNQUlBLFFBQUEsRUFBVSxNQUpWO01BS0EsSUFBQSxFQUFTLElBQUgsR0FBYSxJQUFJLENBQUMsU0FBTCxDQUFlLElBQWYsQ0FBYixHQUF1QyxNQUw3QztNQU1BLE9BQUEsRUFBUyxTQUFDLElBQUQ7QUFDUCxZQUFB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LEdBQXZCLENBQTJCLE9BQU8sQ0FBQyxLQUFuQztBQUNBLGNBTEY7T0FBQSxNQUFBOzZCQUFBOztBQURGOztFQUpvQjs7RUFhdEIsbUJBQUEsR0FBc0IsU0FBQTtXQUNwQixDQUFBLENBQUUsYUFBRixDQUFnQixDQUFDLEtBQWpCLENBQXVCLFNBQUMsQ0FBRDtBQUNyQixVQUFBO01BQUEsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtNQUNBLFNBQUEsR0FBWTtNQUNaLENBQUEsQ0FBRSw2QkFBRixDQUFnQyxDQUFDLElBQWpDLENBQXNDLFNBQUE7ZUFDcEMsU0FBUyxDQUFDLElBQVYsQ0FBZSxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsR0FBUixDQUFBLENBQWY7TUFEb0MsQ0FBdEM7TUFFQSxjQUFBLEdBQWlCLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsZ0JBQWI7YUFDakIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFoQixHQUEwQixjQUFELEdBQWdCLGFBQWhCLEdBQTRCLENBQUMsU0FBUyxDQUFDLElBQVYsQ0FBZSxHQUFmLENBQUQ7SUFOaEMsQ0FBdkI7RUFEb0I7QUFsR3RCIiwiZmlsZSI6InNjcmlwdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIndpbmRvdy5hcGlfY2FsbCA9IChtZXRob2QsIHVybCwgcGFyYW1zLCBkYXRhLCBjYWxsYmFjaykgLT5cbiAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBkYXRhIHx8IHBhcmFtc1xuICBkYXRhID0gZGF0YSB8fCBwYXJhbXNcbiAgaWYgYXJndW1lbnRzLmxlbmd0aCA9PSA0XG4gICAgZGF0YSA9IHVuZGVmaW5lZFxuICBpZiBhcmd1bWVudHMubGVuZ3RoID09ICAzXG4gICAgcGFyYW1zID0gdW5kZWZpbmVkXG4gICAgZGF0YSA9IHVuZGVmaW5lZFxuICBwYXJhbXMgPSBwYXJhbXMgfHwge31cbiAgZm9yIGssIHYgb2YgcGFyYW1zXG4gICAgZGVsZXRlIHBhcmFtc1trXSBpZiBub3Qgdj9cbiAgc2VwYXJhdG9yID0gaWYgdXJsLnNlYXJjaCgnXFxcXD8nKSA+PSAwIHRoZW4gJyYnIGVsc2UgJz8nXG4gICQuYWpheFxuICAgIHR5cGU6IG1ldGhvZFxuICAgIHVybDogXCIje3VybH0je3NlcGFyYXRvcn0jeyQucGFyYW0gcGFyYW1zfVwiXG4gICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIGFjY2VwdHM6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICBkYXRhOiBpZiBkYXRhIHRoZW4gSlNPTi5zdHJpbmdpZnkoZGF0YSkgZWxzZSB1bmRlZmluZWRcbiAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgIGlmIGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJ1xuICAgICAgICBtb3JlID0gdW5kZWZpbmVkXG4gICAgICAgIGlmIGRhdGEubmV4dF91cmxcbiAgICAgICAgICBtb3JlID0gKGNhbGxiYWNrKSAtPiBhcGlfY2FsbChtZXRob2QsIGRhdGEubmV4dF91cmwsIHt9LCBjYWxsYmFjaylcbiAgICAgICAgY2FsbGJhY2s/IHVuZGVmaW5lZCwgZGF0YS5yZXN1bHQsIG1vcmVcbiAgICAgIGVsc2VcbiAgICAgICAgY2FsbGJhY2s/IGRhdGFcbiAgICBlcnJvcjogKGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93bikgLT5cbiAgICAgIGVycm9yID1cbiAgICAgICAgZXJyb3JfY29kZTogJ2FqYXhfZXJyb3InXG4gICAgICAgIHRleHRfc3RhdHVzOiB0ZXh0U3RhdHVzXG4gICAgICAgIGVycm9yX3Rocm93bjogZXJyb3JUaHJvd25cbiAgICAgICAganFYSFI6IGpxWEhSXG4gICAgICB0cnlcbiAgICAgICAgZXJyb3IgPSAkLnBhcnNlSlNPTihqcVhIUi5yZXNwb25zZVRleHQpIGlmIGpxWEhSLnJlc3BvbnNlVGV4dFxuICAgICAgY2F0Y2ggZVxuICAgICAgICBlcnJvciA9IGVycm9yXG4gICAgICBMT0cgJ2FwaV9jYWxsIGVycm9yJywgZXJyb3JcbiAgICAgIGNhbGxiYWNrPyBlcnJvclxuIiwid2luZG93LkxPRyA9IC0+XG4gIGNvbnNvbGU/LmxvZz8gYXJndW1lbnRzLi4uXG5cblxud2luZG93LmluaXRfY29tbW9uID0gLT5cbiAgaW5pdF9sb2FkaW5nX2J1dHRvbigpXG4gIGluaXRfY29uZmlybV9idXR0b24oKVxuICBpbml0X3Bhc3N3b3JkX3Nob3dfYnV0dG9uKClcbiAgaW5pdF90aW1lKClcbiAgaW5pdF9hbm5vdW5jZW1lbnQoKVxuICBpbml0X3Jvd19saW5rKClcblxuXG53aW5kb3cuaW5pdF9sb2FkaW5nX2J1dHRvbiA9IC0+XG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1sb2FkaW5nJywgLT5cbiAgICAkKHRoaXMpLmJ1dHRvbiAnbG9hZGluZydcblxuXG53aW5kb3cuaW5pdF9jb25maXJtX2J1dHRvbiA9IC0+XG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1jb25maXJtJywgLT5cbiAgICBpZiBub3QgY29uZmlybSAkKHRoaXMpLmRhdGEoJ21lc3NhZ2UnKSBvciAnQXJlIHlvdSBzdXJlPydcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcblxuXG53aW5kb3cuaW5pdF9wYXNzd29yZF9zaG93X2J1dHRvbiA9IC0+XG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1wYXNzd29yZC1zaG93JywgLT5cbiAgICAkdGFyZ2V0ID0gJCgkKHRoaXMpLmRhdGEgJ3RhcmdldCcpXG4gICAgJHRhcmdldC5mb2N1cygpXG4gICAgaWYgJCh0aGlzKS5oYXNDbGFzcyAnYWN0aXZlJ1xuICAgICAgJHRhcmdldC5hdHRyICd0eXBlJywgJ3Bhc3N3b3JkJ1xuICAgIGVsc2VcbiAgICAgICR0YXJnZXQuYXR0ciAndHlwZScsICd0ZXh0J1xuXG5cbndpbmRvdy5pbml0X3RpbWUgPSAtPlxuICBpZiAkKCd0aW1lJykubGVuZ3RoID4gMFxuICAgIHJlY2FsY3VsYXRlID0gLT5cbiAgICAgICQoJ3RpbWVbZGF0ZXRpbWVdJykuZWFjaCAtPlxuICAgICAgICBkYXRlID0gbW9tZW50LnV0YyAkKHRoaXMpLmF0dHIgJ2RhdGV0aW1lJ1xuICAgICAgICBkaWZmID0gbW9tZW50KCkuZGlmZiBkYXRlICwgJ2RheXMnXG4gICAgICAgIGlmIGRpZmYgPiAyNVxuICAgICAgICAgICQodGhpcykudGV4dCBkYXRlLmxvY2FsKCkuZm9ybWF0ICdZWVlZLU1NLUREJ1xuICAgICAgICBlbHNlXG4gICAgICAgICAgJCh0aGlzKS50ZXh0IGRhdGUuZnJvbU5vdygpXG4gICAgICAgICQodGhpcykuYXR0ciAndGl0bGUnLCBkYXRlLmxvY2FsKCkuZm9ybWF0ICdkZGRkLCBNTU1NIERvIFlZWVksIEhIOm1tOnNzIFonXG4gICAgICBzZXRUaW1lb3V0IGFyZ3VtZW50cy5jYWxsZWUsIDEwMDAgKiA0NVxuICAgIHJlY2FsY3VsYXRlKClcblxuXG53aW5kb3cuaW5pdF9hbm5vdW5jZW1lbnQgPSAtPlxuICAkKCcuYWxlcnQtYW5ub3VuY2VtZW50IGJ1dHRvbi5jbG9zZScpLmNsaWNrIC0+XG4gICAgc2Vzc2lvblN0b3JhZ2U/LnNldEl0ZW0gJ2Nsb3NlZEFubm91bmNlbWVudCcsICQoJy5hbGVydC1hbm5vdW5jZW1lbnQnKS5odG1sKClcblxuICBpZiBzZXNzaW9uU3RvcmFnZT8uZ2V0SXRlbSgnY2xvc2VkQW5ub3VuY2VtZW50JykgIT0gJCgnLmFsZXJ0LWFubm91bmNlbWVudCcpLmh0bWwoKVxuICAgICQoJy5hbGVydC1hbm5vdW5jZW1lbnQnKS5zaG93KClcblxuXG53aW5kb3cuaW5pdF9yb3dfbGluayA9IC0+XG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLnJvdy1saW5rJywgLT5cbiAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICQodGhpcykuZGF0YSAnaHJlZidcblxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5ub3QtbGluaycsIChlKSAtPlxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcblxuXG53aW5kb3cuY2xlYXJfbm90aWZpY2F0aW9ucyA9IC0+XG4gICQoJyNub3RpZmljYXRpb25zJykuZW1wdHkoKVxuXG5cbndpbmRvdy5zaG93X25vdGlmaWNhdGlvbiA9IChtZXNzYWdlLCBjYXRlZ29yeT0nd2FybmluZycpIC0+XG4gIGNsZWFyX25vdGlmaWNhdGlvbnMoKVxuICByZXR1cm4gaWYgbm90IG1lc3NhZ2VcblxuICAkKCcjbm90aWZpY2F0aW9ucycpLmFwcGVuZCBcIlwiXCJcbiAgICAgIDxkaXYgY2xhc3M9XCJhbGVydCBhbGVydC1kaXNtaXNzYWJsZSBhbGVydC0je2NhdGVnb3J5fVwiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImNsb3NlXCIgZGF0YS1kaXNtaXNzPVwiYWxlcnRcIiBhcmlhLWhpZGRlbj1cInRydWVcIj4mdGltZXM7PC9idXR0b24+XG4gICAgICAgICN7bWVzc2FnZX1cbiAgICAgIDwvZGl2PlxuICAgIFwiXCJcIlxuIiwiJCAtPlxuICBpbml0X2NvbW1vbigpXG5cbiQgLT4gJCgnaHRtbC5hdXRoJykuZWFjaCAtPlxuICBpbml0X2F1dGgoKVxuXG4kIC0+ICQoJ2h0bWwudXNlci1saXN0JykuZWFjaCAtPlxuICBpbml0X3VzZXJfbGlzdCgpXG5cbiQgLT4gJCgnaHRtbC51c2VyLW1lcmdlJykuZWFjaCAtPlxuICBpbml0X3VzZXJfbWVyZ2UoKVxuIiwid2luZG93LmluaXRfYXV0aCA9IC0+XG4gICQoJy5yZW1lbWJlcicpLmNoYW5nZSAtPlxuICAgIGJ1dHRvbnMgPSAkKCcuYnRuLXNvY2lhbCcpLnRvQXJyYXkoKS5jb25jYXQgJCgnLmJ0bi1zb2NpYWwtaWNvbicpLnRvQXJyYXkoKVxuICAgIGZvciBidXR0b24gaW4gYnV0dG9uc1xuICAgICAgaHJlZiA9ICQoYnV0dG9uKS5wcm9wICdocmVmJ1xuICAgICAgaWYgJCgnLnJlbWVtYmVyIGlucHV0JykuaXMgJzpjaGVja2VkJ1xuICAgICAgICAkKGJ1dHRvbikucHJvcCAnaHJlZicsIFwiI3tocmVmfSZyZW1lbWJlcj10cnVlXCJcbiAgICAgICAgJCgnI3JlbWVtYmVyJykucHJvcCAnY2hlY2tlZCcsIHRydWVcbiAgICAgIGVsc2VcbiAgICAgICAgJChidXR0b24pLnByb3AgJ2hyZWYnLCBocmVmLnJlcGxhY2UgJyZyZW1lbWJlcj10cnVlJywgJydcbiAgICAgICAgJCgnI3JlbWVtYmVyJykucHJvcCAnY2hlY2tlZCcsIGZhbHNlXG5cbiAgJCgnLnJlbWVtYmVyJykuY2hhbmdlKClcbiIsIndpbmRvdy5pbml0X3VzZXJfbGlzdCA9IC0+XG4gIGluaXRfdXNlcl9zZWxlY3Rpb25zKClcbiAgaW5pdF91c2VyX2RlbGV0ZV9idG4oKVxuICBpbml0X3VzZXJfbWVyZ2VfYnRuKClcblxuXG5pbml0X3VzZXJfc2VsZWN0aW9ucyA9IC0+XG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5lYWNoIC0+XG4gICAgdXNlcl9zZWxlY3Rfcm93ICQodGhpcylcblxuICAkKCcjc2VsZWN0LWFsbCcpLmNoYW5nZSAtPlxuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5wcm9wICdjaGVja2VkJywgJCh0aGlzKS5pcyAnOmNoZWNrZWQnXG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cbiAgICAgIHVzZXJfc2VsZWN0X3JvdyAkKHRoaXMpXG5cbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmNoYW5nZSAtPlxuICAgIHVzZXJfc2VsZWN0X3JvdyAkKHRoaXMpXG5cblxudXNlcl9zZWxlY3Rfcm93ID0gKCRlbGVtZW50KSAtPlxuICB1cGRhdGVfdXNlcl9zZWxlY3Rpb25zKClcbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cbiAgICBpZCA9ICRlbGVtZW50LnZhbCgpXG4gICAgJChcIiMje2lkfVwiKS50b2dnbGVDbGFzcyAnd2FybmluZycsICRlbGVtZW50LmlzICc6Y2hlY2tlZCdcblxuXG51cGRhdGVfdXNlcl9zZWxlY3Rpb25zID0gLT5cbiAgc2VsZWN0ZWQgPSAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5sZW5ndGhcbiAgJCgnI3VzZXItYWN0aW9ucycpLnRvZ2dsZUNsYXNzICdoaWRkZW4nLCBzZWxlY3RlZCA9PSAwXG4gICQoJyN1c2VyLW1lcmdlJykudG9nZ2xlQ2xhc3MgJ2hpZGRlbicsIHNlbGVjdGVkIDwgMlxuICBpZiBzZWxlY3RlZCBpcyAwXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdpbmRldGVybWluYXRlJywgZmFsc2VcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2NoZWNrZWQnLCBmYWxzZVxuICBlbHNlIGlmICQoJ2lucHV0W25hbWU9dXNlcl9kYl06bm90KDpjaGVja2VkKScpLmxlbmd0aCBpcyAwXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdpbmRldGVybWluYXRlJywgZmFsc2VcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2NoZWNrZWQnLCB0cnVlXG4gIGVsc2VcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCB0cnVlXG5cblxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBEZWxldGUgVXNlcnMgU3R1ZmZcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbmluaXRfdXNlcl9kZWxldGVfYnRuID0gLT5cbiAgJCgnI3VzZXItZGVsZXRlJykuY2xpY2sgKGUpIC0+XG4gICAgY2xlYXJfbm90aWZpY2F0aW9ucygpXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgY29uZmlybV9tZXNzYWdlID0gKCQodGhpcykuZGF0YSAnY29uZmlybScpLnJlcGxhY2UgJ3t1c2Vyc30nLCAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5sZW5ndGhcbiAgICBpZiBjb25maXJtIGNvbmZpcm1fbWVzc2FnZVxuICAgICAgdXNlcl9rZXlzID0gW11cbiAgICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmVhY2ggLT5cbiAgICAgICAgJCh0aGlzKS5hdHRyICdkaXNhYmxlZCcsIHRydWVcbiAgICAgICAgdXNlcl9rZXlzLnB1c2ggJCh0aGlzKS52YWwoKVxuICAgICAgZGVsZXRlX3VybCA9ICQodGhpcykuZGF0YSAnYXBpLXVybCdcbiAgICAgIHN1Y2Nlc3NfbWVzc2FnZSA9ICQodGhpcykuZGF0YSAnc3VjY2VzcydcbiAgICAgIGVycm9yX21lc3NhZ2UgPSAkKHRoaXMpLmRhdGEgJ2Vycm9yJ1xuICAgICAgYXBpX2NhbGwgJ0RFTEVURScsIGRlbGV0ZV91cmwsIHt1c2VyX2tleXM6IHVzZXJfa2V5cy5qb2luKCcsJyl9LCAoZXJyLCByZXN1bHQpIC0+XG4gICAgICAgIGlmIGVyclxuICAgICAgICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl06ZGlzYWJsZWQnKS5yZW1vdmVBdHRyICdkaXNhYmxlZCdcbiAgICAgICAgICBzaG93X25vdGlmaWNhdGlvbiBlcnJvcl9tZXNzYWdlLnJlcGxhY2UoJ3t1c2Vyc30nLCB1c2VyX2tleXMubGVuZ3RoKSwgJ2RhbmdlcidcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgJChcIiMje3Jlc3VsdC5qb2luKCcsICMnKX1cIikuZmFkZU91dCAtPlxuICAgICAgICAgICQodGhpcykucmVtb3ZlKClcbiAgICAgICAgICB1cGRhdGVfdXNlcl9zZWxlY3Rpb25zKClcbiAgICAgICAgICBzaG93X25vdGlmaWNhdGlvbiBzdWNjZXNzX21lc3NhZ2UucmVwbGFjZSgne3VzZXJzfScsIHVzZXJfa2V5cy5sZW5ndGgpLCAnc3VjY2VzcydcblxuXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIE1lcmdlIFVzZXJzIFN0dWZmXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG53aW5kb3cuaW5pdF91c2VyX21lcmdlID0gLT5cbiAgdXNlcl9rZXlzID0gJCgnI3VzZXJfa2V5cycpLnZhbCgpXG4gIGFwaV91cmwgPSAkKCcuYXBpLXVybCcpLmRhdGEgJ2FwaS11cmwnXG4gIGFwaV9jYWxsICdHRVQnLCBhcGlfdXJsLCB7dXNlcl9rZXlzOiB1c2VyX2tleXN9LCAoZXJyb3IsIHJlc3VsdCkgLT5cbiAgICBpZiBlcnJvclxuICAgICAgTE9HICdTb21ldGhpbmcgd2VudCB0ZXJyaWJseSB3cm9uZydcbiAgICAgIHJldHVyblxuICAgIHdpbmRvdy51c2VyX2RicyA9IHJlc3VsdFxuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5yZW1vdmVBdHRyICdkaXNhYmxlZCdcblxuICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykuY2hhbmdlIChldmVudCkgLT5cbiAgICB1c2VyX2tleSA9ICQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKClcbiAgICBzZWxlY3RfZGVmYXVsdF91c2VyIHVzZXJfa2V5XG5cblxuc2VsZWN0X2RlZmF1bHRfdXNlciA9ICh1c2VyX2tleSkgLT5cbiAgJCgnLnVzZXItcm93JykucmVtb3ZlQ2xhc3MoJ3N1Y2Nlc3MnKS5hZGRDbGFzcyAnZGFuZ2VyJ1xuICAkKFwiIyN7dXNlcl9rZXl9XCIpLnJlbW92ZUNsYXNzKCdkYW5nZXInKS5hZGRDbGFzcyAnc3VjY2VzcydcblxuICBmb3IgdXNlcl9kYiBpbiB1c2VyX2Ric1xuICAgIGlmIHVzZXJfa2V5ID09IHVzZXJfZGIua2V5XG4gICAgICAkKCdpbnB1dFtuYW1lPXVzZXJfa2V5XScpLnZhbCB1c2VyX2RiLmtleVxuICAgICAgJCgnaW5wdXRbbmFtZT11c2VybmFtZV0nKS52YWwgdXNlcl9kYi51c2VybmFtZVxuICAgICAgJCgnaW5wdXRbbmFtZT1uYW1lXScpLnZhbCB1c2VyX2RiLm5hbWVcbiAgICAgICQoJ2lucHV0W25hbWU9ZW1haWxdJykudmFsIHVzZXJfZGIuZW1haWxcbiAgICAgIGJyZWFrXG5cblxuaW5pdF91c2VyX21lcmdlX2J0biA9IC0+XG4gICQoJyN1c2VyLW1lcmdlJykuY2xpY2sgKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgdXNlcl9rZXlzID0gW11cbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5lYWNoIC0+XG4gICAgICB1c2VyX2tleXMucHVzaCAkKHRoaXMpLnZhbCgpXG4gICAgdXNlcl9tZXJnZV91cmwgPSAkKHRoaXMpLmRhdGEgJ3VzZXItbWVyZ2UtdXJsJ1xuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gXCIje3VzZXJfbWVyZ2VfdXJsfT91c2VyX2tleXM9I3t1c2VyX2tleXMuam9pbignLCcpfVwiXG4iXX0=
