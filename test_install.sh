cd /private/tmp
mkdir -p test_watermill
cd test_watermill
/usr/local/bin/claude plugin install aio-watermill-kit@aiocean-plugins || echo "failed"
