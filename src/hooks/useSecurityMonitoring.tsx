
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useSecurityMonitoring = () => {
  const { user } = useAuth();

  const logSecurityEvent = async (eventType: string, details: any = {}) => {
    if (!user) return;

    try {
      // Log to console for debugging
      console.log('[SECURITY]', eventType, details);

      // In a real application, you might want to log this to a security monitoring service
      // For now, we'll just log it locally
      const securityEvent = {
        user_id: user.id,
        event_type: eventType,
        timestamp: new Date().toISOString(),
        details: JSON.stringify(details),
        user_agent: navigator.userAgent,
        ip_address: 'client-side' // Would need server-side logging for real IP
      };

      // You could send this to a logging service or database
      console.log('[SECURITY EVENT]', securityEvent);
    } catch (error) {
      console.error('[SECURITY ERROR] Failed to log security event:', error);
    }
  };

  const detectSuspiciousActivity = () => {
    // Monitor for rapid form submissions
    let formSubmissionCount = 0;
    const resetInterval = 60000; // 1 minute

    const monitorFormSubmissions = () => {
      formSubmissionCount++;
      
      if (formSubmissionCount > 10) {
        logSecurityEvent('suspicious_form_activity', {
          submissions_per_minute: formSubmissionCount,
          threshold_exceeded: true
        });
      }

      setTimeout(() => {
        formSubmissionCount = Math.max(0, formSubmissionCount - 1);
      }, resetInterval);
    };

    // Monitor for console access (potential developer tools usage)
    const monitorConsoleAccess = () => {
      let devtools = false;
      const threshold = 160;

      setInterval(() => {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools) {
            devtools = true;
            logSecurityEvent('developer_tools_detected', {
              window_dimensions: {
                outer: { width: window.outerWidth, height: window.outerHeight },
                inner: { width: window.innerWidth, height: window.innerHeight }
              }
            });
          }
        } else {
          devtools = false;
        }
      }, 500);
    };

    return {
      monitorFormSubmissions,
      monitorConsoleAccess
    };
  };

  useEffect(() => {
    const { monitorConsoleAccess } = detectSuspiciousActivity();
    monitorConsoleAccess();

    // Log user session start
    logSecurityEvent('session_start', {
      timestamp: new Date().toISOString()
    });

    // Cleanup on unmount
    return () => {
      logSecurityEvent('session_end', {
        timestamp: new Date().toISOString()
      });
    };
  }, [user]);

  return {
    logSecurityEvent,
    detectSuspiciousActivity
  };
};
