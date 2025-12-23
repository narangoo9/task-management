
class StateManager {
    constructor() {
       
        this.state = {
            tasks: [],
            projects: [],
            currentPage: 'dashboard',
            searchQuery: '',
            isLoading: false,
            error: null
        };
        
        
        this.subscribers = [];
    }
    
    
    getState() {
        return { ...this.state }; // Copy буцаах - мутаци хамгаалах
    }
    
    // State-ийг өөрчлөх функц
    setState(updates) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...updates };
        this.notifySubscribers(prevState, this.state);
    }
    
    // ID-аар task олох
    getTaskById(id) {
        return this.state.tasks.find(task => task.id === id);
    }
    
    // ID-аар project олох
    getProjectById(id) {
        return this.state.projects.find(project => project.id === id);
    }
    
    // Task нэмэх
    addTask(task) {
        const newTasks = [...this.state.tasks, task];
        this.setState({ tasks: newTasks });
        return task;
    }
    
    // Project нэмэх
    addProject(project) {
        const newProjects = [...this.state.projects, project];
        this.setState({ projects: newProjects });
        return project;
    }
    
    // ID-аар task засах
    updateTask(id, updates) {
        const updatedTasks = this.state.tasks.map(task => 
            task.id === id ? { ...task, ...updates } : task
        );
        this.setState({ tasks: updatedTasks });
        return this.getTaskById(id);
    }
    
    // ID-аар project засах
    updateProject(id, updates) {
        const updatedProjects = this.state.projects.map(project => 
            project.id === id ? { ...project, ...updates } : project
        );
        this.setState({ projects: updatedProjects });
        return this.getProjectById(id);
    }
    
    // ID-аар task устгах
    deleteTask(id) {
        const filteredTasks = this.state.tasks.filter(task => task.id !== id);
        this.setState({ tasks: filteredTasks });
    }
    
    // ID-аар project устгах
    deleteProject(id) {
        const filteredProjects = this.state.projects.filter(project => project.id !== id);
        this.setState({ projects: filteredProjects });
    }
    
    // Бүх tasks-уудыг тохируулах
    setTasks(tasks) {
        this.setState({ tasks: [...tasks] });
    }
    
    // Бүх projects-уудыг тохируулах
    setProjects(projects) {
        this.setState({ projects: [...projects] });
    }
    
    // Observer pattern - state өөрчлөгдөхөд мэдэгдэх
    subscribe(callback) {
        this.subscribers.push(callback);
        // Unsubscribe функц буцаах
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }
    
    // Бүх subscribers-уудыг мэдэгдэх
    notifySubscribers(prevState, newState) {
        this.subscribers.forEach(callback => {
            try {
                callback(newState, prevState);
            } catch (error) {
                console.error('State subscriber error:', error);
            }
        });
    }
    
    // Хуудас солих
    setCurrentPage(page) {
        this.setState({ currentPage: page });
    }
    
    // Хайлтын query тохируулах
    setSearchQuery(query) {
        this.setState({ searchQuery: query });
    }
    
    // Loading state тохируулах
    setLoading(isLoading) {
        this.setState({ isLoading });
    }
    
    // Error state тохируулах
    setError(error) {
        this.setState({ error });
    }
}

// Global state manager instance үүсгэх
const stateManager = new StateManager();

// Export хийх (ES6 module болгох)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = stateManager;
}

