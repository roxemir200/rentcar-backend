-- Delete duplicate FAQs, keeping only the one with the smallest ID
DELETE f1 FROM faqs f1
INNER JOIN faqs f2 
WHERE f1.id > f2.id AND f1.question = f2.question;
