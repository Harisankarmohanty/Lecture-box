// Lecture Video Player Application with Folder Selection

class LecturePlayer {
    constructor() {
        this.defaultLectures = [
            {
                id: "sample_1",
                title: "Sample: Introduction to Web Development",
                duration: 1800,
                videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                description: "Sample lecture - Select your own folder to load your lectures",
                isDefault: true
            },
            {
                id: "sample_2",
                title: "Sample: HTML Fundamentals",
                duration: 2100,
                videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                description: "Sample lecture - Select your own folder to load your lectures",
                isDefault: true
            }
        ];

        this.supportedVideoFormats = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];

        this.lectures = [...this.defaultLectures]; // Start with default lectures
        this.currentLectureIndex = -1;
        this.currentLecture = null;
        this.progressData = this.loadProgressData();
        this.isVideoLoading = false;
        this.selectedFolderHandle = null;
        this.selectedFiles = [];
        this.blobUrls = new Map(); // Track blob URLs for cleanup

        this.initializeElements();
        this.bindEvents();
        this.renderLectureList();
        this.updateOverallProgress();
        this.setupKeyboardShortcuts();
        this.loadSavedFolder();
    }

    initializeElements() {
        // Video elements
        this.videoPlayer = document.getElementById('videoPlayer');
        this.videoContainer = document.getElementById('videoContainer');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.noVideoMessage = document.getElementById('noVideoMessage');

        // Control elements
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.progressFill = document.getElementById('progressFill');
        this.progressHandle = document.getElementById('progressHandle');
        this.currentTimeDisplay = document.getElementById('currentTime');
        this.totalTimeDisplay = document.getElementById('totalTime');
        this.volumeBtn = document.getElementById('volumeBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.speedSelector = document.getElementById('speedSelector');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');

        // Navigation elements
        this.prevLectureBtn = document.getElementById('prevLecture');
        this.nextLectureBtn = document.getElementById('nextLecture');
        this.currentLectureTitle = document.getElementById('currentLectureTitle');

        // Progress elements
        this.overallProgress = document.getElementById('overallProgress');
        this.lectureList = document.getElementById('lectureList');

        // Folder selection elements
        this.selectFolderBtn = document.getElementById('selectFolderBtn');
        this.folderInput = document.getElementById('folderInput');
        this.folderInfo = document.getElementById('folderInfo');
        this.folderPathText = document.getElementById('folderPathText');
        this.videoCount = document.getElementById('videoCount');
        this.refreshFolderBtn = document.getElementById('refreshFolderBtn');
        this.folderLoading = document.getElementById('folderLoading');
        this.folderError = document.getElementById('folderError');
        this.folderErrorText = document.getElementById('folderErrorText');

        this.videoControls = document.getElementById('videoControls');
        this.progressTimeline = this.videoControls.querySelector('.progress-bar-video');
    }

    bindEvents() {
        // Folder selection events - bind first to ensure they work
        if (this.selectFolderBtn) {
            this.selectFolderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectFolder();
            });
        }

        if (this.folderInput) {
            this.folderInput.addEventListener('change', (e) => this.handleFolderInputChange(e));
        }

        if (this.refreshFolderBtn) {
            this.refreshFolderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.refreshFolder();
            });
        }

        // Video events
        this.videoPlayer.addEventListener('loadstart', () => this.showLoading());
        this.videoPlayer.addEventListener('loadeddata', () => this.onVideoLoaded());
        this.videoPlayer.addEventListener('canplay', () => this.hideLoading());
        this.videoPlayer.addEventListener('error', (e) => this.onVideoError(e));
        this.videoPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.videoPlayer.addEventListener('ended', () => this.onVideoEnded());
        this.videoPlayer.addEventListener('play', () => this.updatePlayPauseButton());
        this.videoPlayer.addEventListener('pause', () => this.updatePlayPauseButton());

        // Control events
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.volumeBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        this.speedSelector.addEventListener('change', (e) => this.setPlaybackSpeed(e.target.value));
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // Progress bar events
        this.progressTimeline.addEventListener('click', (e) => this.seekToPosition(e));
        this.progressTimeline.addEventListener('mousemove', (e) => this.updateProgressHandle(e));

        // Navigation events
        this.prevLectureBtn.addEventListener('click', () => this.previousLecture());
        this.nextLectureBtn.addEventListener('click', () => this.nextLecture());

        // Fullscreen events
        document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('mozfullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('MSFullscreenChange', () => this.updateFullscreenButton());
    }

    // New folder selection functionality
    async selectFolder() {
        console.log('Folder selection button clicked'); // Debug log
        this.showFolderLoading('Preparing folder selection...');
        this.hideFolderError();

        try {
            // Check if File System Access API is supported
            if ('showDirectoryPicker' in window) {
                console.log('Using modern File System Access API');
                await this.selectFolderModern();
            } else {
                console.log('Falling back to webkitdirectory');
                this.selectFolderFallback();
            }
        } catch (error) {
            console.error('Folder selection error:', error);
            if (error.name === 'AbortError') {
                this.hideFolderLoading();
                return; // User cancelled, don't show error
            }
            this.showFolderError('Error accessing folder. Please try again.');
            this.hideFolderLoading();
        }
    }

    async selectFolderModern() {
        try {
            const directoryHandle = await window.showDirectoryPicker({
                mode: 'read'
            });

            this.selectedFolderHandle = directoryHandle;
            this.showFolderLoading('Scanning folder for videos...');

            const files = await this.scanDirectoryForVideos(directoryHandle);
            if (files.length === 0) {
                this.showFolderError('No video files found in selected folder. Supported formats: MP4, MOV, AVI, MKV, WEBM, M4V');
                this.hideFolderLoading();
                return;
            }

            await this.processFolderSelection(directoryHandle.name, files);
            this.saveFolderPath(directoryHandle.name);

        } catch (error) {
            if (error.name === 'AbortError') {
                this.hideFolderLoading();
                return;
            }
            throw error;
        }
    }

    selectFolderFallback() {
        // Show instructions for fallback method
        this.showFolderLoading('Select your video folder using the file picker...');
        this.folderInput.click();
    }

    async handleFolderInputChange(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) {
            this.hideFolderLoading();
            return;
        }

        this.showFolderLoading('Processing selected files...');

        // Filter for video files
        const videoFiles = files.filter(file =>
            this.supportedVideoFormats.some(format =>
                file.name.toLowerCase().endsWith(format.toLowerCase())
            )
        );

        if (videoFiles.length === 0) {
            this.showFolderError('No video files found. Supported formats: MP4, MOV, AVI, MKV, WEBM, M4V');
            this.hideFolderLoading();
            return;
        }

        // Extract folder name from first file path
        const folderName = this.extractFolderName(files[0]);

        await this.processFolderSelection(folderName, videoFiles);
        this.saveFolderPath(folderName);
    }

    async scanDirectoryForVideos(directoryHandle) {
        const videoFiles = [];

        for await (const entry of directoryHandle.values()) {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                if (this.supportedVideoFormats.some(format =>
                    file.name.toLowerCase().endsWith(format.toLowerCase())
                )) {
                    videoFiles.push(file);
                }
            }
        }

        // Sort files alphabetically/numerically
        return this.sortVideoFiles(videoFiles);
    }

    sortVideoFiles(files) {
        return files.sort((a, b) => {
            // Natural sort for better numeric ordering
            return a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        });
    }

    async processFolderSelection(folderName, files) {
        try {
            // Clean up previous blob URLs
            this.cleanupBlobUrls();

            // Generate lectures from files
            const newLectures = await this.generateLecturesFromFiles(files);

            // Replace lectures and reset progress
            this.lectures = newLectures;
            this.resetProgressForNewFolder();

            // Update UI
            this.updateFolderInfo(folderName, files.length);
            this.renderLectureList();
            this.updateOverallProgress();

            this.hideFolderLoading();
            this.hideFolderError();

            // Auto-select first lecture if available
            if (this.lectures.length > 0) {
                this.currentLectureTitle.textContent = 'Ready to start - Select a lecture';
            }

        } catch (error) {
            console.error('Error processing folder:', error);
            this.showFolderError('Error processing video files. Please try again.');
            this.hideFolderLoading();
        }
    }

    async generateLecturesFromFiles(files) {
        const lectures = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const title = this.extractLectureTitle(file.name, i + 1);
            const blobUrl = URL.createObjectURL(file);

            // Store blob URL for cleanup
            this.blobUrls.set(`file_${i + 1}`, blobUrl);

            const lecture = {
                id: `file_${i + 1}`,
                title: title,
                duration: 0, // Will be updated when video loads
                videoUrl: blobUrl,
                description: `Local file: ${file.name}`,
                isDefault: false,
                fileName: file.name,
                fileSize: file.size
            };

            lectures.push(lecture);
        }

        return lectures;
    }

    extractLectureTitle(fileName, index) {
        // Remove file extension
        let title = fileName.replace(/\.[^/.]+$/, '');

        // Handle common naming patterns
        const patterns = [
            /^(\d+)[\s\-\.]*(.+)$/,  // "01 - Introduction" or "1. HTML Basics"
            /^lecture[\s\-]*(\d+)[\s\-]*(.*)$/i,  // "Lecture 1 - Title"
            /^chapter[\s\-]*(\d+)[\s\-]*(.*)$/i   // "Chapter 1 - Title"
        ];

        for (const pattern of patterns) {
            const match = title.match(pattern);
            if (match) {
                const extractedTitle = match[2] || match[1];
                return extractedTitle.trim() || `Lecture ${index}`;
            }
        }

        // Clean up underscores and extra spaces
        title = title.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

        return title || `Lecture ${index}`;
    }

    extractFolderName(file) {
        if (file.webkitRelativePath) {
            const pathParts = file.webkitRelativePath.split('/');
            return pathParts[0] || 'Selected Folder';
        }
        return 'Selected Files';
    }

    cleanupBlobUrls() {
        for (const [key, url] of this.blobUrls) {
            URL.revokeObjectURL(url);
        }
        this.blobUrls.clear();
    }

    resetProgressForNewFolder() {
        // Clear existing progress data for new folder
        this.progressData = {};
        this.lectures.forEach(lecture => {
            this.progressData[lecture.id] = {
                currentTime: 0,
                duration: lecture.duration || 0,
                completed: false,
                watchPercentage: 0
            };
        });
        this.saveProgressData();
    }

    updateFolderInfo(folderName, fileCount) {
        this.folderPathText.textContent = folderName;
        this.videoCount.textContent = `${fileCount} video${fileCount !== 1 ? 's' : ''} found`;
        this.folderInfo.classList.remove('hidden');
    }

    async refreshFolder() {
        if (this.selectedFolderHandle) {
            this.showFolderLoading('Refreshing folder...');
            try {
                const files = await this.scanDirectoryForVideos(this.selectedFolderHandle);
                if (files.length === 0) {
                    this.showFolderError('No video files found in folder.');
                    this.hideFolderLoading();
                    return;
                }
                await this.processFolderSelection(this.selectedFolderHandle.name, files);
            } catch (error) {
                console.error('Refresh error:', error);
                this.showFolderError('Error refreshing folder. Please reselect.');
                this.hideFolderLoading();
            }
        } else {
            // If no modern API handle, prompt to reselect
            this.selectFolder();
        }
    }

    saveFolderPath(folderName) {
        localStorage.setItem('selectedFolderName', folderName);
    }

    loadSavedFolder() {
        const savedFolderName = localStorage.getItem('selectedFolderName');
        if (savedFolderName && this.lectures.some(l => !l.isDefault)) {
            // Only show saved folder info if we have non-default lectures
            this.updateFolderInfo(savedFolderName, this.lectures.filter(l => !l.isDefault).length);
        }
    }

    showFolderLoading(message = 'Scanning folder for videos...') {
        const messageSpan = this.folderLoading.querySelector('span');
        if (messageSpan) {
            messageSpan.textContent = message;
        }
        this.folderLoading.classList.remove('hidden');
        this.folderError.classList.add('hidden');
    }

    hideFolderLoading() {
        this.folderLoading.classList.add('hidden');
    }

    showFolderError(message) {
        this.folderErrorText.textContent = message;
        this.folderError.classList.remove('hidden');
    }

    hideFolderError() {
        this.folderError.classList.add('hidden');
    }

    // Rest of the existing functionality remains the same
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (this.currentLecture && !e.target.matches('input, textarea, select')) {
                switch (e.code) {
                    case 'Space':
                        e.preventDefault();
                        this.togglePlayPause();
                        break;
                    case 'KeyF':
                        e.preventDefault();
                        this.toggleFullscreen();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.seekRelative(-10);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.seekRelative(10);
                        break;
                    case 'Escape':
                        if (this.isFullscreen()) {
                            this.exitFullscreen();
                        }
                        break;
                }
            }
        });
    }

    loadProgressData() {
        const saved = localStorage.getItem('lectureProgress');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Error parsing saved progress:', e);
            }
        }

        // Initialize default progress data
        const defaultProgress = {};
        this.lectures.forEach(lecture => {
            defaultProgress[lecture.id] = {
                currentTime: 0,
                duration: lecture.duration,
                completed: false,
                watchPercentage: 0
            };
        });
        return defaultProgress;
    }

    saveProgressData() {
        try {
            localStorage.setItem('lectureProgress', JSON.stringify(this.progressData));
        } catch (e) {
            console.error('Error saving progress:', e);
        }
    }

    renderLectureList() {
        this.lectureList.innerHTML = '';

        this.lectures.forEach((lecture, index) => {
            // Ensure progress data exists for this lecture
            if (!this.progressData[lecture.id]) {
                this.progressData[lecture.id] = {
                    currentTime: 0,
                    duration: lecture.duration || 0,
                    completed: false,
                    watchPercentage: 0
                };
            }

            const progress = this.progressData[lecture.id];
            const lectureElement = this.createLectureElement(lecture, progress, index);
            this.lectureList.appendChild(lectureElement);
        });
    }

    createLectureElement(lecture, progress, index) {
        const div = document.createElement('div');
        const classes = ['lecture-item'];
        if (progress.completed) classes.push('completed');
        if (lecture.isDefault) classes.push('sample');
        div.className = classes.join(' ');
        div.setAttribute('data-lecture-id', lecture.id);
        div.setAttribute('data-index', index);

        const statusIcon = this.getStatusIcon(progress);
        const formattedDuration = lecture.duration ? this.formatTime(lecture.duration) : 'Unknown';
        const progressPercentage = Math.round(progress.watchPercentage);

        div.innerHTML = `
            <div class="status-indicator">
                ${statusIcon}
            </div>
            <div class="lecture-content">
                <div class="lecture-title">${lecture.title}</div>
                ${lecture.description ? `<div class="lecture-description">${lecture.description}</div>` : ''}
                <div class="lecture-meta">
                    <span>${formattedDuration}</span>
                    <span>${progressPercentage}%</span>
                </div>
                <div class="lecture-progress">
                    <div class="lecture-progress-fill" style="width: ${progress.watchPercentage}%"></div>
                </div>
            </div>
        `;

        div.addEventListener('click', () => this.loadLecture(index));
        return div;
    }

    getStatusIcon(progress) {
        if (progress.completed) {
            return '<svg class="status-icon completed" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        } else if (progress.watchPercentage > 0) {
            return '<svg class="status-icon in-progress" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        } else {
            return '<svg class="status-icon not-started" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
        }
    }

    loadLecture(index) {
        if (index < 0 || index >= this.lectures.length) return;

        // Save current progress before switching
        if (this.currentLecture) {
            this.saveCurrentProgress();
        }

        this.currentLectureIndex = index;
        this.currentLecture = this.lectures[index];
        this.isVideoLoading = true;

        this.showLoading();
        this.hideNoVideoMessage();

        // Update UI
        this.updateLectureSelection();
        this.updateNavigationButtons();
        this.currentLectureTitle.textContent = this.currentLecture.title;

        // Reset video controls
        this.resetVideoControls();

        // Load video with proper error handling
        try {
            this.videoPlayer.src = this.currentLecture.videoUrl;
            this.videoPlayer.load();
        } catch (error) {
            console.error('Error loading video:', error);
            this.onVideoError(error);
        }
    }

    onVideoLoaded() {
        const progress = this.progressData[this.currentLecture.id];

        // Update duration if not set (for local files)
        if (this.currentLecture.duration === 0 && this.videoPlayer.duration) {
            this.currentLecture.duration = Math.floor(this.videoPlayer.duration);
            progress.duration = this.currentLecture.duration;
        }

        // Set resume time if not completed
        if (progress.currentTime > 0 && !progress.completed && progress.currentTime < this.videoPlayer.duration) {
            this.videoPlayer.currentTime = progress.currentTime;
        }

        this.isVideoLoading = false;
        this.updateTimeDisplays();
    }

    onVideoError(event) {
        console.error('Video loading error:', event);
        this.hideLoading();
        this.isVideoLoading = false;

        // Show error message with better styling
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: white;
            background: rgba(0,0,0,0.8);
            padding: 24px;
            border-radius: 8px;
            z-index: 20;
            max-width: 300px;
        `;
        errorMessage.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: #ff5459;">Video Loading Error</h3>
            <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.8);">
                Unable to load the lecture video. This might be a network issue or the video file is not accessible.
            </p>
        `;

        this.videoContainer.appendChild(errorMessage);
        setTimeout(() => {
            if (errorMessage.parentNode) {
                errorMessage.parentNode.removeChild(errorMessage);
            }
        }, 5000);
    }

    resetVideoControls() {
        this.progressFill.style.width = '0%';
        this.progressHandle.style.left = '0%';
        this.currentTimeDisplay.textContent = '0:00';
        this.totalTimeDisplay.textContent = '0:00';
    }

    updateTimeDisplays() {
        if (this.videoPlayer.duration) {
            this.totalTimeDisplay.textContent = this.formatTime(this.videoPlayer.duration);
        }
    }

    updateLectureSelection() {
        // Remove active class from all lectures
        document.querySelectorAll('.lecture-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to current lecture
        const currentItem = document.querySelector(`[data-index="${this.currentLectureIndex}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
        }
    }

    updateNavigationButtons() {
        this.prevLectureBtn.disabled = this.currentLectureIndex <= 0;
        this.nextLectureBtn.disabled = this.currentLectureIndex >= this.lectures.length - 1;
    }

    previousLecture() {
        if (this.currentLectureIndex > 0) {
            this.loadLecture(this.currentLectureIndex - 1);
        }
    }

    nextLecture() {
        if (this.currentLectureIndex < this.lectures.length - 1) {
            this.loadLecture(this.currentLectureIndex + 1);
        }
    }

    togglePlayPause() {
        if (!this.currentLecture || this.isVideoLoading) return;

        if (this.videoPlayer.paused) {
            this.videoPlayer.play().catch(e => console.error('Play failed:', e));
        } else {
            this.videoPlayer.pause();
        }
    }

    updatePlayPauseButton() {
        const playIcon = this.playPauseBtn.querySelector('.play-icon');
        const pauseIcon = this.playPauseBtn.querySelector('.pause-icon');

        if (this.videoPlayer.paused) {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        } else {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        }
    }

    updateProgress() {
        if (!this.currentLecture || this.isVideoLoading) return;

        const currentTime = this.videoPlayer.currentTime;
        const duration = this.videoPlayer.duration;

        if (duration > 0) {
            const progressPercentage = (currentTime / duration) * 100;
            this.progressFill.style.width = `${progressPercentage}%`;
            this.progressHandle.style.left = `${progressPercentage}%`;

            // Update time displays
            this.currentTimeDisplay.textContent = this.formatTime(currentTime);
            this.totalTimeDisplay.textContent = this.formatTime(duration);

            // Update progress data
            const lectureProgress = this.progressData[this.currentLecture.id];
            lectureProgress.currentTime = currentTime;
            lectureProgress.watchPercentage = progressPercentage;
            lectureProgress.completed = progressPercentage >= 95;

            // Save progress every 5 seconds
            if (Math.floor(currentTime) % 5 === 0) {
                this.saveProgressData();
                this.updateLectureListItem();
                this.updateOverallProgress();
            }
        }
    }

    updateLectureListItem() {
        const currentItem = document.querySelector(`[data-lecture-id="${this.currentLecture.id}"]`);
        if (currentItem) {
            const progress = this.progressData[this.currentLecture.id];
            const progressFill = currentItem.querySelector('.lecture-progress-fill');
            const percentageSpan = currentItem.querySelector('.lecture-meta span:last-child');

            progressFill.style.width = `${progress.watchPercentage}%`;
            percentageSpan.textContent = `${Math.round(progress.watchPercentage)}%`;

            if (progress.completed) {
                currentItem.classList.add('completed');
            }

            // Update status icon
            const statusIcon = currentItem.querySelector('.status-indicator');
            statusIcon.innerHTML = this.getStatusIcon(progress);
        }
    }

    saveCurrentProgress() {
        if (this.currentLecture && this.videoPlayer.currentTime > 0) {
            const progress = this.progressData[this.currentLecture.id];
            progress.currentTime = this.videoPlayer.currentTime;
            if (this.videoPlayer.duration) {
                progress.watchPercentage = (this.videoPlayer.currentTime / this.videoPlayer.duration) * 100;
                progress.completed = progress.watchPercentage >= 95;
            }
            this.saveProgressData();
        }
    }

    onVideoEnded() {
        // Mark as completed
        const progress = this.progressData[this.currentLecture.id];
        progress.completed = true;
        progress.watchPercentage = 100;
        progress.currentTime = 0; // Reset for next viewing

        this.saveProgressData();
        this.updateLectureListItem();
        this.updateOverallProgress();

        // Auto-advance to next lecture
        setTimeout(() => {
            if (this.currentLectureIndex < this.lectures.length - 1) {
                this.nextLecture();
            }
        }, 2000);
    }

    seekToPosition(event) {
        if (!this.currentLecture || this.isVideoLoading) return;

        const rect = this.progressTimeline.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        const newTime = percentage * this.videoPlayer.duration;

        this.videoPlayer.currentTime = newTime;
    }

    seekRelative(seconds) {
        if (!this.currentLecture || this.isVideoLoading) return;

        const newTime = Math.max(0, Math.min(this.videoPlayer.duration, this.videoPlayer.currentTime + seconds));
        this.videoPlayer.currentTime = newTime;
    }

    updateProgressHandle(event) {
        const rect = this.progressTimeline.getBoundingClientRect();
        const hoverX = event.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (hoverX / rect.width) * 100));
        // This could show a preview time, but for now we'll just use it for the handle position on hover
    }

    toggleMute() {
        this.videoPlayer.muted = !this.videoPlayer.muted;
        this.updateVolumeIcon();
    }

    setVolume(value) {
        this.videoPlayer.volume = value / 100;
        this.videoPlayer.muted = false;
        this.updateVolumeIcon();
    }

    updateVolumeIcon() {
        // Volume icon update could be enhanced with different icons based on volume level
    }

    setPlaybackSpeed(speed) {
        this.videoPlayer.playbackRate = parseFloat(speed);
    }

    isFullscreen() {
        return !!(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement);
    }

    toggleFullscreen() {
        if (!this.isFullscreen()) {
            this.requestFullscreen();
        } else {
            this.exitFullscreen();
        }
    }

    requestFullscreen() {
        const element = this.videoContainer;

        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    updateFullscreenButton() {
        const fullscreenIcon = this.fullscreenBtn.querySelector('.fullscreen-icon');
        const exitFullscreenIcon = this.fullscreenBtn.querySelector('.exit-fullscreen-icon');

        if (this.isFullscreen()) {
            fullscreenIcon.classList.add('hidden');
            exitFullscreenIcon.classList.remove('hidden');
        } else {
            fullscreenIcon.classList.remove('hidden');
            exitFullscreenIcon.classList.add('hidden');
        }
    }

    updateOverallProgress() {
        const totalLectures = this.lectures.length;
        if (totalLectures === 0) return;

        const completedLectures = Object.values(this.progressData).filter(p => p.completed).length;
        const overallPercentage = (completedLectures / totalLectures) * 100;

        this.overallProgress.style.width = `${overallPercentage}%`;

        // Update percentage display
        const percentageDisplay = document.querySelector('.progress-percentage');
        if (percentageDisplay) {
            percentageDisplay.textContent = `${Math.round(overallPercentage)}%`;
        }

        // Calculate time information
        const totalTime = this.lectures.reduce((sum, lecture) => sum + (lecture.duration || 0), 0);
        const completedTime = Object.entries(this.progressData).reduce((sum, [lectureId, progress]) => {
            const lecture = this.lectures.find(l => l.id === lectureId);
            const lectureDuration = lecture?.duration || 0;
            return sum + (progress.completed ? lectureDuration : (lectureDuration * progress.watchPercentage / 100));
        }, 0);

        const remainingTime = totalTime - completedTime;

        const completedTimeEl = document.querySelector('.completed-time');
        const remainingTimeEl = document.querySelector('.remaining-time');

        if (completedTimeEl) {
            completedTimeEl.textContent = this.formatTime(completedTime);
        }
        if (remainingTimeEl) {
            remainingTimeEl.textContent = `${this.formatTime(remainingTime)} remaining`;
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    showLoading() {
        this.loadingOverlay.classList.add('show');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('show');
    }

    hideNoVideoMessage() {
        this.noVideoMessage.classList.add('hidden');
    }

    showNoVideoMessage() {
        this.noVideoMessage.classList.remove('hidden');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.lecturePlayer = new LecturePlayer();
});

// Save progress before page unload and cleanup blob URLs
window.addEventListener('beforeunload', () => {
    if (window.lecturePlayer) {
        if (window.lecturePlayer.currentLecture) {
            window.lecturePlayer.saveCurrentProgress();
        }
        // Cleanup blob URLs
        window.lecturePlayer.cleanupBlobUrls();
    }
});