# LectureBox

> **A modern, browser-based video lecture player with persistent progress tracking, local folder import, and auto-resume capabilities. Perfect for self-paced learning!**

***

## ✨ Features

- **Import entire lecture folders** from your device (supports drag & drop or folder picker)
- **Auto-resume:** Each video resumes from where you left off
- **Completion status:** Visual indicators for completed, in-progress, and unwatched lectures
- **Progress bar:** Shows how much of each lecture (and the whole course) is complete
- **Custom video controls:** Playback speed selection, volume, and fullscreen support
- **Keyboard shortcuts:** Space (play/pause), F (fullscreen), Arrow keys (seek)
- **Fully responsive UI:** Optimized for desktop and mobile
- **No backend required:** All data stored safely in your browser

***


## 📂 Getting Started

### 1. Clone the Repository

```sh
git clone https://github.com/Harisankarmohanty/lecture-box.git
cd lecture-box
```

### 2. Open the App

Open `index.html` in your favorite web browser.  
_No build tools or dependencies required. Just double-click and go!_

***

## 🛠️ Technologies Used

- **HTML5** (semantic markup, `<video>`, file input, folder selection)
- **CSS3** (responsive layout, dark theme)
- **Vanilla JavaScript (ES6+)**
  - File System Access API & `webkitdirectory`
  - HTML5 Video API and Fullscreen API
  - localStorage for persistent progress

***

## 📖 Usage

1. Click **Select Lecture Folder** in the sidebar.
2. Choose a folder containing your lecture videos (`.mp4`, `.webm`, `.mkv`, etc.).
3. Browse the sidebar to see your lectures, completion status, and overall course progress.
4. Click any video to start watching.  
   - Playback position is saved every second — refresh or close the browser at any time, and your progress is restored!
5. All features (fullscreen, speed, next/prev lecture, etc.) remain available for local content.

***

## ⚠️ Notes

- **Privacy:** All your progress data stays on your device — nothing is ever uploaded or tracked by anyone else.
- **Browser Support:** Folder import works best in Chrome/Edge. Firefox uses a fallback method (`webkitdirectory`), but some features may vary.
- Videos must be in a supported format compatible with your browser (preferably `.mp4` or `.webm`).

***

## 🙏 Acknowledgements

- Inspired by learning platforms like Udemy and Coursera
- [MDN Web Docs](https://developer.mozilla.org/) for in-depth browser API documentation

***

> _Made with ♥ for lifelong learners._
