// Jenkinsfile - MSTI Automation CI/CD Pipeline
// This pipeline polls GitHub and handles blue-green deployment automatically

pipeline {
    agent any
    
    environment {
        DOCKER_USERNAME = 'dafit17docker'
        DEPLOY_DIR = '/opt/msti-automation'
        IMAGE_TAG = 'latest'
    }
    
    triggers {
        // Poll GitHub every 2 minutes for changes
        // No webhook needed - Jenkins initiates the connection
        pollSCM('H/2 * * * *')
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '📥 Checking out source code...'
                checkout scm
            }
        }
        
        stage('Detect Changes') {
            steps {
                script {
                    echo '🔍 Detecting changes...'
                    
                    // Get changed files from last commit
                    def changes = sh(
                        script: "git diff --name-only HEAD~1 HEAD 2>/dev/null || echo 'initial'",
                        returnStdout: true
                    ).trim()
                    
                    echo "Changed files:\n${changes}"
                    
                    env.BACKEND_CHANGED = changes.contains('backend/') ? 'true' : 'false'
                    env.FRONTEND_CHANGED = changes.contains('frontend/') ? 'true' : 'false'
                    env.DEPLOYMENT_CHANGED = changes.contains('deployment/') ? 'true' : 'false'
                    
                    echo "Backend changed: ${env.BACKEND_CHANGED}"
                    echo "Frontend changed: ${env.FRONTEND_CHANGED}"
                    echo "Deployment changed: ${env.DEPLOYMENT_CHANGED}"
                }
            }
        }
        
        stage('Build Backend') {
            when {
                expression { env.BACKEND_CHANGED == 'true' }
            }
            steps {
                echo '🔨 Building backend image...'
                dir('backend') {
                    sh """
                        docker build -t ${DOCKER_USERNAME}/backend:${IMAGE_TAG} .
                        docker build -t ${DOCKER_USERNAME}/backend:${BUILD_NUMBER} .
                    """
                }
            }
        }
        
        stage('Build Frontend') {
            when {
                expression { env.FRONTEND_CHANGED == 'true' }
            }
            steps {
                echo '🔨 Building frontend image...'
                dir('frontend/msti-automation') {
                    sh """
                        docker build -t ${DOCKER_USERNAME}/frontend:${IMAGE_TAG} .
                        docker build -t ${DOCKER_USERNAME}/frontend:${BUILD_NUMBER} .
                    """
                }
            }
        }
        
        stage('Push Images') {
            when {
                expression { env.BACKEND_CHANGED == 'true' || env.FRONTEND_CHANGED == 'true' }
            }
            steps {
                echo '📤 Pushing images to Docker Hub...'
                withCredentials([usernamePassword(
                    credentialsId: 'docker-hub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin
                        
                        if [ "${env.BACKEND_CHANGED}" = "true" ]; then
                            docker push ${DOCKER_USERNAME}/backend:${IMAGE_TAG}
                            docker push ${DOCKER_USERNAME}/backend:${BUILD_NUMBER}
                            echo "✅ Backend pushed"
                        fi
                        
                        if [ "${env.FRONTEND_CHANGED}" = "true" ]; then
                            docker push ${DOCKER_USERNAME}/frontend:${IMAGE_TAG}
                            docker push ${DOCKER_USERNAME}/frontend:${BUILD_NUMBER}
                            echo "✅ Frontend pushed"
                        fi
                        
                        docker logout
                    """
                }
            }
        }
        
        stage('Detect Active Environment') {
            steps {
                script {
                    echo '🔍 Detecting current active environment...'
                    
                    def blueRunning = sh(
                        script: "docker ps --filter 'name=msti-backend-blue' --filter 'status=running' -q",
                        returnStdout: true
                    ).trim()
                    
                    def greenRunning = sh(
                        script: "docker ps --filter 'name=msti-backend-green' --filter 'status=running' -q",
                        returnStdout: true
                    ).trim()
                    
                    if (blueRunning) {
                        env.CURRENT_ENV = 'blue'
                        env.NEXT_ENV = 'green'
                    } else if (greenRunning) {
                        env.CURRENT_ENV = 'green'
                        env.NEXT_ENV = 'blue'
                    } else {
                        env.CURRENT_ENV = 'none'
                        env.NEXT_ENV = 'blue'
                    }
                    
                    echo "Current environment: ${env.CURRENT_ENV}"
                    echo "Next environment: ${env.NEXT_ENV}"
                }
            }
        }
        
        stage('Deploy to Next Environment') {
            when {
                expression { 
                    env.BACKEND_CHANGED == 'true' || 
                    env.FRONTEND_CHANGED == 'true' || 
                    env.DEPLOYMENT_CHANGED == 'true' 
                }
            }
            steps {
                echo "🚀 Deploying to ${env.NEXT_ENV} environment..."
                dir("${DEPLOY_DIR}/deployment") {
                    sh """
                        # Load environment variables from .env file
                        if [ -f .env ]; then
                            set -a
                            . ./.env
                            set +a
                        fi
                        
                        # Override with build-specific values
                        export DOCKER_USERNAME=${DOCKER_USERNAME}
                        export IMAGE_TAG=${IMAGE_TAG}
                        export DEPLOYMENT_TIMESTAMP=\$(date +%Y%m%d-%H%M%S)
                        
                        # Pull latest images
                        docker compose -f docker-compose.${env.NEXT_ENV}.yml pull
                        
                        # Start new environment
                        docker compose -f docker-compose.${env.NEXT_ENV}.yml up -d --force-recreate --remove-orphans
                        
                        echo "✅ ${env.NEXT_ENV} environment started"
                    """
                }
            }
        }
        
        stage('Health Check') {
            when {
                expression { 
                    env.BACKEND_CHANGED == 'true' || 
                    env.FRONTEND_CHANGED == 'true' || 
                    env.DEPLOYMENT_CHANGED == 'true' 
                }
            }
            steps {
                echo "🏥 Waiting for ${env.NEXT_ENV} environment to be healthy..."
                script {
                    def backendPort = env.NEXT_ENV == 'blue' ? '3001' : '3003'
                    def frontendPort = env.NEXT_ENV == 'blue' ? '5172' : '5173'
                    def maxRetries = 30
                    def healthy = false
                    
                    for (int i = 0; i < maxRetries; i++) {
                        sleep(10)
                        
                        def backendHealth = sh(
                            script: "curl -sf http://localhost:${backendPort}/health || echo 'unhealthy'",
                            returnStdout: true
                        ).trim()
                        
                        def frontendHealth = sh(
                            script: "curl -sf http://localhost:${frontendPort}/ || echo 'unhealthy'",
                            returnStdout: true
                        ).trim()
                        
                        if (backendHealth != 'unhealthy' && frontendHealth != 'unhealthy') {
                            healthy = true
                            echo "✅ Both services are healthy!"
                            break
                        }
                        
                        echo "⏳ Waiting... (${i + 1}/${maxRetries})"
                    }
                    
                    if (!healthy) {
                        error("❌ Health check failed after ${maxRetries} attempts")
                    }
                }
            }
        }
        
        stage('Stop Old Environment') {
            when {
                expression { 
                    (env.BACKEND_CHANGED == 'true' || env.FRONTEND_CHANGED == 'true' || env.DEPLOYMENT_CHANGED == 'true') &&
                    env.CURRENT_ENV != 'none'
                }
            }
            steps {
                echo "🛑 Stopping old ${env.CURRENT_ENV} environment..."
                dir("${DEPLOY_DIR}/deployment") {
                    sh """
                        # Gracefully stop old environment
                        docker compose -f docker-compose.${env.CURRENT_ENV}.yml down --remove-orphans || true
                        
                        echo "✅ Old ${env.CURRENT_ENV} environment stopped"
                    """
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                echo '🧹 Cleaning up old images...'
                sh """
                    # Remove dangling images
                    docker image prune -f || true
                    
                    # Keep only last 5 build images
                    docker images ${DOCKER_USERNAME}/backend --format '{{.Tag}}' | \
                        grep -E '^[0-9]+\$' | sort -rn | tail -n +6 | \
                        xargs -I {} docker rmi ${DOCKER_USERNAME}/backend:{} 2>/dev/null || true
                    
                    docker images ${DOCKER_USERNAME}/frontend --format '{{.Tag}}' | \
                        grep -E '^[0-9]+\$' | sort -rn | tail -n +6 | \
                        xargs -I {} docker rmi ${DOCKER_USERNAME}/frontend:{} 2>/dev/null || true
                """
            }
        }
    }
    
    post {
        success {
            echo """
            ✅ DEPLOYMENT SUCCESSFUL!
            ========================
            Environment: ${env.NEXT_ENV ?: 'N/A'}
            Build: #${BUILD_NUMBER}
            Backend changed: ${env.BACKEND_CHANGED}
            Frontend changed: ${env.FRONTEND_CHANGED}
            """
        }
        failure {
            echo """
            ❌ DEPLOYMENT FAILED!
            ====================
            Check the logs above for details.
            You may need to manually rollback using:
            cd ${DEPLOY_DIR} && deployment/deploy.sh rollback
            """
            
            // Attempt automatic rollback
            script {
                if (env.CURRENT_ENV && env.CURRENT_ENV != 'none') {
                    echo "🔄 Attempting automatic rollback to ${env.CURRENT_ENV}..."
                    sh """
                        cd ${DEPLOY_DIR}/deployment
                        docker compose -f docker-compose.${env.NEXT_ENV}.yml down --remove-orphans || true
                        docker compose -f docker-compose.${env.CURRENT_ENV}.yml up -d || true
                    """
                }
            }
        }
        always {
            cleanWs()
        }
    }
}
