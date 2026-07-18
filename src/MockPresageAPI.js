export class MockPresageAPI {
  constructor() {
    this.intervalId = null;
    this.metrics = {
      boredom: 10,
      distraction: 15,
      struggling: 5,
      mood: 'Neutral',
      matchPercentage: 85
    };
    
    // For random walk calculations
    this.targets = { ...this.metrics };
  }

  start(onUpdate) {
    // Initial callback
    onUpdate({ ...this.metrics });
    
    this.intervalId = setInterval(() => {
      this._simulateDataGen();
      onUpdate({ ...this.metrics });
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  _simulateDataGen() {
    const moods = ['Focused', 'Neutral', 'Happy', 'Frustrated', 'Tired', 'Engaged'];
    
    // Random walk towards a changing target for smoothness
    if (Math.random() > 0.8) {
      this.targets.boredom = Math.max(0, Math.min(100, this.metrics.boredom + (Math.random() * 40 - 20)));
      this.targets.distraction = Math.max(0, Math.min(100, this.metrics.distraction + (Math.random() * 40 - 20)));
      this.targets.struggling = Math.max(0, Math.min(100, this.metrics.struggling + (Math.random() * 40 - 20)));
      
      // Correlated logic: If struggling is high, match percentage goes down, mood might be frustrated
      let expectedMatch = 100 - (this.targets.boredom * 0.3 + this.targets.distraction * 0.4 + this.targets.struggling * 0.3);
      this.targets.matchPercentage = Math.max(10, Math.min(100, expectedMatch + (Math.random() * 10 - 5)));
    }
    
    // Evolve current values towards targets (easing)
    this.metrics.boredom += (this.targets.boredom - this.metrics.boredom) * 0.2;
    this.metrics.distraction += (this.targets.distraction - this.metrics.distraction) * 0.2;
    this.metrics.struggling += (this.targets.struggling - this.metrics.struggling) * 0.2;
    this.metrics.matchPercentage += (this.targets.matchPercentage - this.metrics.matchPercentage) * 0.2;

    // Determine discrete mood based on continuous variables
    if (this.metrics.struggling > 60) {
      this.metrics.mood = 'Frustrated';
    } else if (this.metrics.boredom > 60) {
      this.metrics.mood = 'Tired';
    } else if (this.metrics.distraction > 50) {
      this.metrics.mood = 'Distracted';
    } else if (this.metrics.matchPercentage > 85) {
      this.metrics.mood = 'Focused';
    } else if (this.metrics.matchPercentage > 70) {
      this.metrics.mood = 'Engaged';
    } else {
      // Pick random occasionally if neutral
      if (Math.random() > 0.9) {
        this.metrics.mood = moods[Math.floor(Math.random() * moods.length)];
      } else {
        this.metrics.mood = 'Neutral';
      }
    }
  }
}
