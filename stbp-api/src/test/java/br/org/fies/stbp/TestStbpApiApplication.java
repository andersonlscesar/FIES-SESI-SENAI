package br.org.fies.stbp;

import org.springframework.boot.SpringApplication;

/** Sobe a API com um Postgres descartável (Testcontainers), sem precisar do compose. */
public class TestStbpApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(StbpApiApplication::main).with(TestcontainersConfiguration.class)
				.withAdditionalProfiles("dev").run(args);
	}

}
