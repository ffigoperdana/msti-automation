FROM jenkins/jenkins:lts-jdk17

# Switch to root to install packages
USER root

# Install CA certificates and other useful tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    ca-certificates-java \
    curl \
    git \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Fix Java SSL certificate trust - use known cacerts path for JDK17
# This fixes the "PKIX path building failed" error
ENV JAVA_CACERTS=/opt/java/openjdk/lib/security/cacerts

# Import the complete CA bundle into Java truststore
RUN \
    echo "Importing CA certificates into Java truststore at: $JAVA_CACERTS" && \
    # Backup original cacerts
    cp "$JAVA_CACERTS" "$JAVA_CACERTS.bak" && \
    # Method 1: Import from the CA bundle (most reliable)
    # Split the CA bundle and import each certificate
    csplit -f /tmp/cert- -b '%03d.pem' -z /etc/ssl/certs/ca-certificates.crt '/-----BEGIN CERTIFICATE-----/' '{*}' 2>/dev/null || true && \
    for cert in /tmp/cert-*.pem; do \
        if [ -s "$cert" ]; then \
            alias="ca-$(basename $cert .pem)"; \
            keytool -import -trustcacerts -keystore "$JAVA_CACERTS" \
                -storepass changeit -noprompt -alias "$alias" \
                -file "$cert" 2>/dev/null || true; \
        fi; \
    done && \
    rm -f /tmp/cert-*.pem && \
    # Verify certificates were imported
    echo "Certificates in Java truststore:" && \
    keytool -list -keystore "$JAVA_CACERTS" -storepass changeit 2>/dev/null | head -5 && \
    echo "CA certificates import completed"

# Switch back to jenkins user
USER jenkins
