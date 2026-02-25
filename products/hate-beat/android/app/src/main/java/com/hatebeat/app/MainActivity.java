package com.hatebeat.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable immersive mode for full-screen gaming
        hideSystemUI();
        
        // Configure WebView for optimal game performance
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        
        // Enable hardware acceleration
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        
        // JavaScript is already enabled by Capacitor
        // Add any additional WebView optimizations here
    }
    
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }
    
    private void hideSystemUI() {
        // Enables regular immersive mode
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }
    
    @Override
    public void onBackPressed() {
        // Let the web app handle the back button
        // The game will show a pause menu when back is pressed during gameplay
        WebView webView = getBridge().getWebView();
        webView.evaluateJavascript(
            "if (typeof handleBackButton === 'function') { handleBackButton(); } else { history.back(); }",
            null
        );
    }
}