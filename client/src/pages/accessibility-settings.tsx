import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, 
  Ear, 
  Keyboard, 
  MousePointer,
  Type,
  Palette,
  Globe,
  Volume2,
  ZoomIn,
  Monitor,
  Mic,
  Hand,
  Brain,
  Settings,
  Check,
  AlertCircle,
  Info,
  ChevronRight,
  Accessibility
} from "lucide-react";

interface AccessibilitySettings {
  // Visual
  highContrast: boolean;
  darkMode: boolean;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
  
  // Motor
  keyboardNavigation: boolean;
  stickyKeys: boolean;
  slowKeys: boolean;
  mouseKeys: boolean;
  clickAssist: boolean;
  
  // Auditory
  screenReader: boolean;
  soundAlerts: boolean;
  captionsEnabled: boolean;
  signLanguageEnabled: boolean;
  audioDescriptions: boolean;
  
  // Cognitive
  readingMode: boolean;
  focusMode: boolean;
  reducedMotion: boolean;
  simpleLanguage: boolean;
  readingGuide: boolean;
  
  // Interaction
  voiceControl: boolean;
  eyeTracking: boolean;
  switchControl: boolean;
  dwellClicking: boolean;
  
  // Language
  language: string;
  rtlMode: boolean;
  autoTranslate: boolean;
}

export default function AccessibilitySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    darkMode: false,
    fontSize: 16,
    fontFamily: 'system-ui',
    lineHeight: 1.5,
    letterSpacing: 0,
    colorBlindMode: 'none',
    keyboardNavigation: true,
    stickyKeys: false,
    slowKeys: false,
    mouseKeys: false,
    clickAssist: false,
    screenReader: false,
    soundAlerts: false,
    captionsEnabled: false,
    signLanguageEnabled: false,
    audioDescriptions: false,
    readingMode: false,
    focusMode: false,
    reducedMotion: false,
    simpleLanguage: false,
    readingGuide: false,
    voiceControl: false,
    eyeTracking: false,
    switchControl: false,
    dwellClicking: false,
    language: 'en',
    rtlMode: false,
    autoTranslate: false,
  });

  const [wcagCompliance, setWcagCompliance] = useState({
    level: 'AA',
    score: 92,
    issues: 3,
    passed: 47,
    warnings: 8
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibilitySettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Apply settings
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply visual settings
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('dark', settings.darkMode);
    root.classList.toggle('reduced-motion', settings.reducedMotion);
    root.classList.toggle('focus-mode', settings.focusMode);
    root.classList.toggle('reading-mode', settings.readingMode);
    
    // Apply font settings
    root.style.setProperty('--base-font-size', `${settings.fontSize}px`);
    root.style.setProperty('--font-family', settings.fontFamily);
    root.style.setProperty('--line-height', settings.lineHeight.toString());
    root.style.setProperty('--letter-spacing', `${settings.letterSpacing}px`);
    
    // Apply color blind mode
    if (settings.colorBlindMode !== 'none') {
      root.setAttribute('data-color-blind-mode', settings.colorBlindMode);
    } else {
      root.removeAttribute('data-color-blind-mode');
    }
    
    // Apply RTL mode
    root.dir = settings.rtlMode ? 'rtl' : 'ltr';
    
    // Apply language
    root.lang = settings.language;
    
    // Save settings
    localStorage.setItem('accessibilitySettings', JSON.stringify(settings));
  }, [settings]);

  const handleSettingChange = (key: keyof AccessibilitySettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Announce change to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = `${key} has been ${typeof value === 'boolean' ? (value ? 'enabled' : 'disabled') : `set to ${value}`}`;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  };

  const runAccessibilityAudit = () => {
    toast({
      title: "Accessibility Audit Started",
      description: "Running comprehensive WCAG 2.1 compliance check...",
    });
    
    // Simulate audit
    setTimeout(() => {
      setWcagCompliance({
        level: 'AA',
        score: 95,
        issues: 2,
        passed: 51,
        warnings: 5
      });
      
      toast({
        title: "Audit Complete",
        description: "Your accessibility score has improved to 95%!",
      });
    }, 2000);
  };

  const presets = [
    { name: 'Low Vision', icon: Eye, settings: { highContrast: true, fontSize: 20, letterSpacing: 1 } },
    { name: 'Dyslexia', icon: Brain, settings: { fontFamily: 'OpenDyslexic', lineHeight: 2, letterSpacing: 2 } },
    { name: 'Motor Impairment', icon: Hand, settings: { keyboardNavigation: true, stickyKeys: true, clickAssist: true } },
    { name: 'Hearing Impaired', icon: Ear, settings: { captionsEnabled: true, soundAlerts: false, signLanguageEnabled: true } },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Accessibility className="w-8 h-8 text-blue-600" />
                  Accessibility Settings
                </h1>
                <p className="text-gray-600 mt-2">
                  Customize your experience with comprehensive accessibility options
                </p>
              </div>
              <Button 
                onClick={runAccessibilityAudit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Run Accessibility Audit
              </Button>
            </div>
          </div>

          {/* WCAG Compliance Card */}
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>WCAG 2.1 Compliance Status</span>
                <Badge className="bg-green-600 text-white">Level {wcagCompliance.level}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{wcagCompliance.score}%</div>
                  <div className="text-sm text-gray-600">Compliance Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{wcagCompliance.passed}</div>
                  <div className="text-sm text-gray-600">Tests Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{wcagCompliance.issues}</div>
                  <div className="text-sm text-gray-600">Critical Issues</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{wcagCompliance.warnings}</div>
                  <div className="text-sm text-gray-600">Warnings</div>
                </div>
                <div className="text-center">
                  <Button variant="outline" size="sm" className="mt-2">
                    View Full Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Presets */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Quick Presets</CardTitle>
              <CardDescription>
                Apply recommended settings for common accessibility needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {presets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => setSettings(prev => ({ ...prev, ...preset.settings }))}
                  >
                    <preset.icon className="w-8 h-8 text-blue-600" />
                    <span className="font-medium">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Settings */}
          <Tabs defaultValue="visual" className="space-y-6">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="visual">Visual</TabsTrigger>
              <TabsTrigger value="motor">Motor</TabsTrigger>
              <TabsTrigger value="auditory">Auditory</TabsTrigger>
              <TabsTrigger value="cognitive">Cognitive</TabsTrigger>
              <TabsTrigger value="interaction">Interaction</TabsTrigger>
              <TabsTrigger value="language">Language</TabsTrigger>
            </TabsList>

            {/* Visual Settings */}
            <TabsContent value="visual">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Visual Accessibility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">High Contrast Mode</label>
                          <p className="text-sm text-gray-600">Increase contrast for better visibility</p>
                        </div>
                        <Switch
                          checked={settings.highContrast}
                          onCheckedChange={(checked) => handleSettingChange('highContrast', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Dark Mode</label>
                          <p className="text-sm text-gray-600">Reduce eye strain in low light</p>
                        </div>
                        <Switch
                          checked={settings.darkMode}
                          onCheckedChange={(checked) => handleSettingChange('darkMode', checked)}
                        />
                      </div>

                      <div>
                        <label className="font-medium">Color Blind Mode</label>
                        <Select 
                          value={settings.colorBlindMode}
                          onValueChange={(value) => handleSettingChange('colorBlindMode', value)}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="protanopia">Protanopia (Red-Green)</SelectItem>
                            <SelectItem value="deuteranopia">Deuteranopia (Red-Green)</SelectItem>
                            <SelectItem value="tritanopia">Tritanopia (Blue-Yellow)</SelectItem>
                            <SelectItem value="achromatopsia">Achromatopsia (Complete)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="font-medium flex items-center justify-between">
                          <span>Font Size</span>
                          <span className="text-sm text-gray-600">{settings.fontSize}px</span>
                        </label>
                        <Slider
                          value={[settings.fontSize]}
                          onValueChange={([value]) => handleSettingChange('fontSize', value)}
                          min={12}
                          max={32}
                          step={1}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <label className="font-medium flex items-center justify-between">
                          <span>Line Height</span>
                          <span className="text-sm text-gray-600">{settings.lineHeight}</span>
                        </label>
                        <Slider
                          value={[settings.lineHeight]}
                          onValueChange={([value]) => handleSettingChange('lineHeight', value)}
                          min={1}
                          max={3}
                          step={0.1}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <label className="font-medium flex items-center justify-between">
                          <span>Letter Spacing</span>
                          <span className="text-sm text-gray-600">{settings.letterSpacing}px</span>
                        </label>
                        <Slider
                          value={[settings.letterSpacing]}
                          onValueChange={([value]) => handleSettingChange('letterSpacing', value)}
                          min={0}
                          max={5}
                          step={0.5}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <label className="font-medium">Font Family</label>
                        <Select 
                          value={settings.fontFamily}
                          onValueChange={(value) => handleSettingChange('fontFamily', value)}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system-ui">System Default</SelectItem>
                            <SelectItem value="Arial">Arial</SelectItem>
                            <SelectItem value="OpenDyslexic">OpenDyslexic</SelectItem>
                            <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                            <SelectItem value="Verdana">Verdana</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Motor Settings */}
            <TabsContent value="motor">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hand className="w-5 h-5" />
                    Motor Accessibility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Keyboard Navigation</label>
                          <p className="text-sm text-gray-600">Navigate using keyboard only</p>
                        </div>
                        <Switch
                          checked={settings.keyboardNavigation}
                          onCheckedChange={(checked) => handleSettingChange('keyboardNavigation', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Sticky Keys</label>
                          <p className="text-sm text-gray-600">Press modifier keys one at a time</p>
                        </div>
                        <Switch
                          checked={settings.stickyKeys}
                          onCheckedChange={(checked) => handleSettingChange('stickyKeys', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Slow Keys</label>
                          <p className="text-sm text-gray-600">Delay between key presses</p>
                        </div>
                        <Switch
                          checked={settings.slowKeys}
                          onCheckedChange={(checked) => handleSettingChange('slowKeys', checked)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Mouse Keys</label>
                          <p className="text-sm text-gray-600">Control mouse with keyboard</p>
                        </div>
                        <Switch
                          checked={settings.mouseKeys}
                          onCheckedChange={(checked) => handleSettingChange('mouseKeys', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Click Assist</label>
                          <p className="text-sm text-gray-600">Larger click targets and hover zones</p>
                        </div>
                        <Switch
                          checked={settings.clickAssist}
                          onCheckedChange={(checked) => handleSettingChange('clickAssist', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Keyboard Shortcuts */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-3">Keyboard Shortcuts</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><kbd>Alt + H</kbd> - Go to Home</div>
                      <div><kbd>Alt + S</kbd> - Search</div>
                      <div><kbd>Alt + P</kbd> - Profile</div>
                      <div><kbd>Alt + A</kbd> - Accessibility</div>
                      <div><kbd>Tab</kbd> - Next element</div>
                      <div><kbd>Shift + Tab</kbd> - Previous element</div>
                      <div><kbd>Enter</kbd> - Activate element</div>
                      <div><kbd>Esc</kbd> - Close dialog</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Auditory Settings */}
            <TabsContent value="auditory">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ear className="w-5 h-5" />
                    Auditory Accessibility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Screen Reader Support</label>
                          <p className="text-sm text-gray-600">Enable ARIA announcements</p>
                        </div>
                        <Switch
                          checked={settings.screenReader}
                          onCheckedChange={(checked) => handleSettingChange('screenReader', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Sound Alerts</label>
                          <p className="text-sm text-gray-600">Audio feedback for actions</p>
                        </div>
                        <Switch
                          checked={settings.soundAlerts}
                          onCheckedChange={(checked) => handleSettingChange('soundAlerts', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Captions</label>
                          <p className="text-sm text-gray-600">Show captions for videos</p>
                        </div>
                        <Switch
                          checked={settings.captionsEnabled}
                          onCheckedChange={(checked) => handleSettingChange('captionsEnabled', checked)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Sign Language</label>
                          <p className="text-sm text-gray-600">Show sign language interpreter</p>
                        </div>
                        <Switch
                          checked={settings.signLanguageEnabled}
                          onCheckedChange={(checked) => handleSettingChange('signLanguageEnabled', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Audio Descriptions</label>
                          <p className="text-sm text-gray-600">Narrate visual content</p>
                        </div>
                        <Switch
                          checked={settings.audioDescriptions}
                          onCheckedChange={(checked) => handleSettingChange('audioDescriptions', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cognitive Settings */}
            <TabsContent value="cognitive">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Cognitive Accessibility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Reading Mode</label>
                          <p className="text-sm text-gray-600">Simplified, distraction-free view</p>
                        </div>
                        <Switch
                          checked={settings.readingMode}
                          onCheckedChange={(checked) => handleSettingChange('readingMode', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Focus Mode</label>
                          <p className="text-sm text-gray-600">Highlight current section</p>
                        </div>
                        <Switch
                          checked={settings.focusMode}
                          onCheckedChange={(checked) => handleSettingChange('focusMode', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Reduced Motion</label>
                          <p className="text-sm text-gray-600">Minimize animations</p>
                        </div>
                        <Switch
                          checked={settings.reducedMotion}
                          onCheckedChange={(checked) => handleSettingChange('reducedMotion', checked)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Simple Language</label>
                          <p className="text-sm text-gray-600">Use plain English</p>
                        </div>
                        <Switch
                          checked={settings.simpleLanguage}
                          onCheckedChange={(checked) => handleSettingChange('simpleLanguage', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Reading Guide</label>
                          <p className="text-sm text-gray-600">Show reading ruler</p>
                        </div>
                        <Switch
                          checked={settings.readingGuide}
                          onCheckedChange={(checked) => handleSettingChange('readingGuide', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Interaction Settings */}
            <TabsContent value="interaction">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MousePointer className="w-5 h-5" />
                    Alternative Interaction Methods
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Voice Control</label>
                          <p className="text-sm text-gray-600">Control with voice commands</p>
                        </div>
                        <Switch
                          checked={settings.voiceControl}
                          onCheckedChange={(checked) => handleSettingChange('voiceControl', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Eye Tracking</label>
                          <p className="text-sm text-gray-600">Navigate with eye movements</p>
                        </div>
                        <Switch
                          checked={settings.eyeTracking}
                          onCheckedChange={(checked) => handleSettingChange('eyeTracking', checked)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Switch Control</label>
                          <p className="text-sm text-gray-600">Use external switches</p>
                        </div>
                        <Switch
                          checked={settings.switchControl}
                          onCheckedChange={(checked) => handleSettingChange('switchControl', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Dwell Clicking</label>
                          <p className="text-sm text-gray-600">Click by hovering</p>
                        </div>
                        <Switch
                          checked={settings.dwellClicking}
                          onCheckedChange={(checked) => handleSettingChange('dwellClicking', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  {settings.voiceControl && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        Voice Commands
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>"Navigate home" - Go to dashboard</div>
                        <div>"Open problems" - View problems</div>
                        <div>"Start interview" - Begin AI interview</div>
                        <div>"Show profile" - View profile</div>
                        <div>"Scroll down" - Scroll page down</div>
                        <div>"Scroll up" - Scroll page up</div>
                        <div>"Click submit" - Submit form</div>
                        <div>"Help" - Show commands</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Language Settings */}
            <TabsContent value="language">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Language & Localization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="font-medium">Display Language</label>
                        <Select 
                          value={settings.language}
                          onValueChange={(value) => handleSettingChange('language', value)}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                            <SelectItem value="zh">中文</SelectItem>
                            <SelectItem value="ar">العربية</SelectItem>
                            <SelectItem value="hi">हिन्दी</SelectItem>
                            <SelectItem value="ja">日本語</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Right-to-Left Mode</label>
                          <p className="text-sm text-gray-600">For RTL languages</p>
                        </div>
                        <Switch
                          checked={settings.rtlMode}
                          onCheckedChange={(checked) => handleSettingChange('rtlMode', checked)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Auto-Translate</label>
                          <p className="text-sm text-gray-600">Translate content automatically</p>
                        </div>
                        <Switch
                          checked={settings.autoTranslate}
                          onCheckedChange={(checked) => handleSettingChange('autoTranslate', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Settings */}
          <div className="mt-6 flex justify-end gap-4">
            <Button 
              variant="outline"
              onClick={() => {
                setSettings({
                  highContrast: false,
                  darkMode: false,
                  fontSize: 16,
                  fontFamily: 'system-ui',
                  lineHeight: 1.5,
                  letterSpacing: 0,
                  colorBlindMode: 'none',
                  keyboardNavigation: true,
                  stickyKeys: false,
                  slowKeys: false,
                  mouseKeys: false,
                  clickAssist: false,
                  screenReader: false,
                  soundAlerts: false,
                  captionsEnabled: false,
                  signLanguageEnabled: false,
                  audioDescriptions: false,
                  readingMode: false,
                  focusMode: false,
                  reducedMotion: false,
                  simpleLanguage: false,
                  readingGuide: false,
                  voiceControl: false,
                  eyeTracking: false,
                  switchControl: false,
                  dwellClicking: false,
                  language: 'en',
                  rtlMode: false,
                  autoTranslate: false,
                });
                toast({
                  title: "Settings Reset",
                  description: "All accessibility settings have been reset to defaults.",
                });
              }}
            >
              Reset to Defaults
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                toast({
                  title: "Settings Saved",
                  description: "Your accessibility preferences have been saved.",
                });
              }}
            >
              <Check className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}